import { auth } from "@space-scavenger-hunt/auth";
import prisma from "@space-scavenger-hunt/db";
import { deleteBlob, getReadSasUrl, openBlobReadStream, uploadImage } from "@space-scavenger-hunt/api/services/azure-blob";
import { judgeSelfie } from "@space-scavenger-hunt/api/services/ai/judge-selfie";
import { applySelfieJudgement } from "@space-scavenger-hunt/api/services/selfies";
import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response } from "express";
import { z } from "zod";

async function getUser(req: Request) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  return session ? prisma.user.findUnique({ where: { id: session.user.id }, include: { player: true } }) : null;
}

export async function uploadSelfie(req: Request, res: Response) {
  const user = await getUser(req);
  if (!user?.player?.isCheckedIn || !user.player.teamId) return res.status(403).json({ message: "Check in and join a team before submitting a selfie." });
  const parsed = z.object({ twin: z.enum(["LUKE", "LEO"]), requestId: z.string().uuid() }).safeParse(req.body);
  const file = req.file;
  if (!parsed.success || !file) return res.status(400).json({ message: "Choose Luke or Leo and a photo." });
  const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const extension = extensions[file.mimetype];
  if (!extension) return res.status(415).json({ message: "Choose a JPEG, PNG, or WebP image." });
  const { twin, requestId } = parsed.data;
  const previous = await prisma.birthdaySelfie.findUnique({ where: { requestId } });
  if (previous) return previous.playerId === user.player.id ? res.json({ id: previous.id, status: previous.status }) : res.status(409).json({ message: "Upload identifier already used." });
  const activity = await prisma.activity.findFirst({ orderBy: { createdAt: "asc" } });
  if (activity?.status !== "ACTIVE") return res.status(403).json({ message: "Selfie challenges open when the mission starts." });
  let selfie;
  try {
    selfie = await prisma.birthdaySelfie.create({ data: { requestId, playerId: user.player.id, teamId: user.player.teamId, twin, activeKey: `${user.player.id}:${twin}` } });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return res.status(409).json({ message: "You already have a selfie pending or approved for this twin." });
    throw error;
  }
  const blobName = `birthday-selfies/${selfie.id}.${extension}`;
  try {
    await uploadImage({ blobName, buffer: file.buffer, contentType: file.mimetype });
    await prisma.birthdaySelfie.update({ where: { id: selfie.id }, data: { imageBlobName: blobName, imageMimeType: file.mimetype } });
  } catch (error) {
    await prisma.birthdaySelfie.update({ where: { id: selfie.id }, data: { status: "UPLOAD_FAILED", activeKey: null, aiFeedback: "Upload failed. Please try again." } });
    await deleteBlob(blobName).catch(() => undefined);
    console.error("[selfie] upload failed", error);
    return res.status(502).json({ message: "Photo upload failed. Please try again." });
  }
  try {
    const judgement = await judgeSelfie(getReadSasUrl(blobName));
    await prisma.$transaction(tx => applySelfieJudgement(tx, selfie.id, judgement));
  } catch (error) {
    console.error("[selfie] AI review failed", error);
    await prisma.birthdaySelfie.updateMany({ where: { id: selfie.id, status: "PROCESSING" }, data: { status: "PENDING_REVIEW", aiFeedback: "AI review is unavailable. An admin can review your photo." } });
  }
  const final = await prisma.birthdaySelfie.findUniqueOrThrow({ where: { id: selfie.id } });
  return res.json({ id: final.id, status: final.status, feedback: final.aiFeedback });
}

export async function getSelfiePhoto(req: Request, res: Response) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ message: "Sign in to view this photo." });
  const id = String(req.params.id ?? "");
  const selfie = await prisma.birthdaySelfie.findUnique({ where: { id } });
  if (!selfie || (user.role !== "ADMIN" && selfie.playerId !== user.player?.id)) return res.status(404).json({ message: "Photo not found." });
  if (!selfie.imageBlobName) return res.status(404).json({ message: "Photo not uploaded yet." });
  try {
    const { stream, contentType } = await openBlobReadStream(selfie.imageBlobName);
    res.setHeader("Content-Type", contentType ?? selfie.imageMimeType ?? "image/jpeg");
    res.setHeader("Cache-Control", "private, no-store");
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  } catch {
    return res.status(502).json({ message: "Could not load photo." });
  }
}
