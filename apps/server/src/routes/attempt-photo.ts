import { verifyAttemptPhotoAccessToken } from "@space-scavenger-hunt/api/services/attempt-photo-url";
import { openBlobReadStream } from "@space-scavenger-hunt/api/services/azure-blob";
import prisma from "@space-scavenger-hunt/db";
import type { Request, Response } from "express";

export async function getAttemptPhoto(req: Request, res: Response) {
  const rawAttemptId = req.params.attemptId;
  const rawToken = req.params.token;
  const attemptId = Array.isArray(rawAttemptId) ? rawAttemptId[0] : rawAttemptId;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  if (!attemptId || !token) {
    return res.status(400).json({ code: "BAD_REQUEST", message: "Missing attempt id or token." });
  }
  if (!verifyAttemptPhotoAccessToken(attemptId, token)) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Invalid or expired photo link." });
  }

  const attempt = await prisma.claimAttempt.findUnique({
    where: { id: attemptId },
    select: { imageBlobName: true, imageMimeType: true },
  });
  if (!attempt?.imageBlobName) {
    return res.status(404).json({ code: "NOT_FOUND", message: "Photo not found." });
  }

  try {
    const { stream, contentType } = await openBlobReadStream(attempt.imageBlobName);
    res.setHeader("Content-Type", contentType ?? attempt.imageMimeType ?? "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=3600, immutable");
    stream.pipe(res);
  } catch (err) {
    console.error("[attempt-photo] Failed to stream blob:", err);
    return res.status(502).json({
      code: "UPSTREAM_ERROR",
      message: "Could not load the photo.",
    });
  }
}
