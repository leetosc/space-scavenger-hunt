import { auth } from "@space-scavenger-hunt/auth";
import prisma from "@space-scavenger-hunt/db";
import {
  buildAstronautBlobName,
  deleteBlob,
  openBlobReadStream,
  uploadImage,
} from "@space-scavenger-hunt/api/services/azure-blob";
import { verifyAstronautPhotoAccessToken } from "@space-scavenger-hunt/api/services/astronaut-photo-url";
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

export async function uploadAstronautPhoto(req: Request, res: Response) {
  if (!(await requireAdmin(req, res))) return;

  const rawAstronautId = req.params.astronautId;
  const astronautId = Array.isArray(rawAstronautId) ? rawAstronautId[0] : rawAstronautId;
  if (!astronautId) {
    return res.status(400).json({ code: "BAD_REQUEST", message: "Missing astronaut id." });
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

  const existing = await prisma.astronaut.findUnique({ where: { id: astronautId } });
  if (!existing) {
    return res.status(404).json({ code: "NOT_FOUND", message: "Astronaut not found." });
  }

  const ext = extensionFromMime(file.mimetype);
  const blobName = buildAstronautBlobName({ astronautId, extension: ext });

  try {
    const uploadResult = await uploadImage({
      blobName,
      buffer: file.buffer,
      contentType: file.mimetype,
    });
    const updated = await prisma.astronaut.update({
      where: { id: astronautId },
      data: {
        imageUrl: uploadResult.url,
        imageBlobName: blobName,
        imageMimeType: file.mimetype,
        imageSizeBytes: file.size,
      },
    });
    if (existing.imageBlobName) {
      await deleteBlob(existing.imageBlobName).catch((err) => {
        console.warn("[astronaut-upload] Failed to delete replaced blob:", err);
      });
    }
    return res.json({ astronaut: updated });
  } catch (err) {
    console.error("[astronaut-upload] Azure upload failed:", err);
    return res.status(502).json({
      code: "UPLOAD_FAILED",
      message: "We could not upload the astronaut image. Please try again.",
    });
  }
}

export async function getAstronautPhoto(req: Request, res: Response) {
  const rawAstronautId = req.params.astronautId;
  const rawToken = req.params.token;
  const astronautId = Array.isArray(rawAstronautId) ? rawAstronautId[0] : rawAstronautId;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  if (!astronautId || !token) {
    return res.status(400).json({ code: "BAD_REQUEST", message: "Missing astronaut id or token." });
  }
  if (!verifyAstronautPhotoAccessToken(astronautId, token)) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Invalid or expired photo link." });
  }

  const astronaut = await prisma.astronaut.findUnique({
    where: { id: astronautId },
    select: { imageBlobName: true, imageMimeType: true },
  });
  if (!astronaut?.imageBlobName) {
    return res.status(404).json({ code: "NOT_FOUND", message: "Photo not found." });
  }

  try {
    const { stream, contentType } = await openBlobReadStream(astronaut.imageBlobName);
    res.setHeader("Content-Type", contentType ?? astronaut.imageMimeType ?? "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=3600, immutable");
    stream.pipe(res);
  } catch (err) {
    console.error("[astronaut-photo] Failed to stream blob:", err);
    return res.status(502).json({
      code: "UPSTREAM_ERROR",
      message: "Could not load the photo.",
    });
  }
}
