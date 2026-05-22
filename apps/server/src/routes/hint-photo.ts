import { auth } from "@space-scavenger-hunt/auth";
import prisma from "@space-scavenger-hunt/db";
import {
  buildHintBlobName,
  deleteBlob,
  openBlobReadStream,
  uploadImage,
} from "@space-scavenger-hunt/api/services/azure-blob";
import { verifyHintPhotoAccessToken } from "@space-scavenger-hunt/api/services/hint-photo-url";
import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response } from "express";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user) {
    res.status(401).json({ code: "UNAUTHORIZED", message: "You must be logged in." });
    return false;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (dbUser?.role !== "ADMIN") {
    res.status(403).json({ code: "FORBIDDEN", message: "Admin access required." });
    return false;
  }

  return true;
}

function getTextField(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim();
  return undefined;
}

export async function uploadLocationHintPhoto(req: Request, res: Response) {
  if (!(await requireAdmin(req, res))) return;

  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) {
    return res.status(400).json({ code: "NO_FILE", message: "No file uploaded." });
  }
  if (!ALLOWED_TYPES.has(file.mimetype)) {
    return res.status(415).json({
      code: "UNSUPPORTED_TYPE",
      message: "Only JPEG, PNG, or WebP images are allowed.",
    });
  }

  const title = getTextField(req.body?.title);
  const description = getTextField(req.body?.description);
  const sortOrderValue = Number(getTextField(req.body?.sortOrder));

  const hint = await prisma.locationHint.create({
    data: {
      title,
      description: description || null,
      sortOrder: Number.isInteger(sortOrderValue) ? sortOrderValue : 0,
    },
  });

  const ext = extensionFromMime(file.mimetype);
  const blobName = buildHintBlobName({ hintId: hint.id, extension: ext });

  try {
    const uploadResult = await uploadImage({
      blobName,
      buffer: file.buffer,
      contentType: file.mimetype,
    });
    const updated = await prisma.locationHint.update({
      where: { id: hint.id },
      data: {
        imageUrl: uploadResult.url,
        imageBlobName: blobName,
        imageMimeType: file.mimetype,
        imageSizeBytes: file.size,
      },
    });
    return res.json({ hint: updated });
  } catch (err) {
    console.error("[hint-upload] Azure upload failed:", err);
    await prisma.locationHint.delete({ where: { id: hint.id } }).catch(() => undefined);
    return res.status(502).json({
      code: "UPLOAD_FAILED",
      message: "We could not upload your location photo. Please try again.",
    });
  }
}

export async function replaceLocationHintPhoto(req: Request, res: Response) {
  if (!(await requireAdmin(req, res))) return;

  const rawHintId = req.params.hintId;
  const hintId = Array.isArray(rawHintId) ? rawHintId[0] : rawHintId;
  if (!hintId) {
    return res.status(400).json({ code: "BAD_REQUEST", message: "Missing hint id." });
  }

  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) {
    return res.status(400).json({ code: "NO_FILE", message: "No file uploaded." });
  }
  if (!ALLOWED_TYPES.has(file.mimetype)) {
    return res.status(415).json({
      code: "UNSUPPORTED_TYPE",
      message: "Only JPEG, PNG, or WebP images are allowed.",
    });
  }

  const existing = await prisma.locationHint.findUnique({ where: { id: hintId } });
  if (!existing) {
    return res.status(404).json({ code: "NOT_FOUND", message: "Hint not found." });
  }

  const ext = extensionFromMime(file.mimetype);
  const blobName = buildHintBlobName({ hintId, extension: ext });

  try {
    const uploadResult = await uploadImage({
      blobName,
      buffer: file.buffer,
      contentType: file.mimetype,
    });
    const updated = await prisma.locationHint.update({
      where: { id: hintId },
      data: {
        imageUrl: uploadResult.url,
        imageBlobName: blobName,
        imageMimeType: file.mimetype,
        imageSizeBytes: file.size,
      },
    });
    if (existing.imageBlobName) {
      await deleteBlob(existing.imageBlobName).catch((err) => {
        console.warn("[hint-upload] Failed to delete replaced blob:", err);
      });
    }
    return res.json({ hint: updated });
  } catch (err) {
    console.error("[hint-upload] Azure upload failed:", err);
    return res.status(502).json({
      code: "UPLOAD_FAILED",
      message: "We could not upload your location photo. Please try again.",
    });
  }
}

export async function getLocationHintPhoto(req: Request, res: Response) {
  const rawHintId = req.params.hintId;
  const rawToken = req.params.token;
  const hintId = Array.isArray(rawHintId) ? rawHintId[0] : rawHintId;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  if (!hintId || !token) {
    return res.status(400).json({ code: "BAD_REQUEST", message: "Missing hint id or token." });
  }
  if (!verifyHintPhotoAccessToken(hintId, token)) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Invalid or expired photo link." });
  }

  const hint = await prisma.locationHint.findUnique({
    where: { id: hintId },
    select: { imageBlobName: true, imageMimeType: true },
  });
  if (!hint?.imageBlobName) {
    return res.status(404).json({ code: "NOT_FOUND", message: "Photo not found." });
  }

  try {
    const { stream, contentType } = await openBlobReadStream(hint.imageBlobName);
    res.setHeader("Content-Type", contentType ?? hint.imageMimeType ?? "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=3600, immutable");
    stream.pipe(res);
  } catch (err) {
    console.error("[hint-photo] Failed to stream blob:", err);
    return res.status(502).json({
      code: "UPSTREAM_ERROR",
      message: "Could not load the photo.",
    });
  }
}
