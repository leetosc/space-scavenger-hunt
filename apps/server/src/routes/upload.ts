import { auth } from "@space-scavenger-hunt/auth";
import prisma from "@space-scavenger-hunt/db";
import { env } from "@space-scavenger-hunt/env/server";
import { buildBlobName, getReadSasUrl, uploadImage } from "@space-scavenger-hunt/api/services/azure-blob";
import { judgeImage } from "@space-scavenger-hunt/api/services/ai/judge-image";
import { approveClaim } from "@space-scavenger-hunt/api/services/claims/approve-claim";
import { rejectClaim } from "@space-scavenger-hunt/api/services/claims/reject-claim";
import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response } from "express";
import multer from "multer";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
});

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

export async function uploadAttemptPhoto(req: Request, res: Response) {
  const rawAttemptId = req.params.attemptId;
  const attemptId = Array.isArray(rawAttemptId) ? rawAttemptId[0] : rawAttemptId;
  if (!attemptId) {
    return res.status(400).json({ code: "BAD_REQUEST", message: "Missing attempt id." });
  }

  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user) {
    return res.status(401).json({ code: "UNAUTHORIZED", message: "You must be logged in." });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { player: true },
  });
  if (!dbUser?.player) {
    return res
      .status(403)
      .json({ code: "NO_PLAYER", message: "You need to check in before submitting photos." });
  }
  if (!dbUser.player.teamId) {
    return res.status(403).json({
      code: "NO_TEAM",
      message: "You have not been assigned to a mission team yet.",
    });
  }

  const activity = await prisma.activity.findFirst({ orderBy: { createdAt: "asc" } });
  if (!activity || activity.status !== "ACTIVE") {
    return res
      .status(403)
      .json({ code: "NOT_ACTIVE", message: "The mission is not currently active." });
  }

  const attempt = await prisma.claimAttempt.findUnique({
    where: { id: attemptId },
    include: { astronaut: true },
  });
  if (!attempt) {
    return res.status(404).json({ code: "NOT_FOUND", message: "Attempt not found." });
  }
  if (attempt.teamId !== dbUser.player.teamId) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Not your team's attempt." });
  }
  if (attempt.status !== "PENDING_PHOTO" && attempt.status !== "REJECTED") {
    return res
      .status(409)
      .json({ code: "INVALID_STATE", message: "This attempt is not awaiting a photo." });
  }
  if (attempt.expiresAt && attempt.expiresAt.getTime() < Date.now()) {
    await prisma.claimAttempt.update({
      where: { id: attempt.id },
      data: { status: "EXPIRED" },
    });
    return res.status(410).json({
      code: "EXPIRED",
      message: "This challenge expired. Please scan the astronaut again to receive a new task.",
    });
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

  const ext = extensionFromMime(file.mimetype);
  const blobName = buildBlobName({
    teamId: attempt.teamId,
    attemptId: attempt.id,
    extension: ext,
  });

  let uploadResult: { url: string };
  try {
    uploadResult = await uploadImage({
      blobName,
      buffer: file.buffer,
      contentType: file.mimetype,
    });
  } catch (err) {
    console.error("[upload] Azure upload failed:", err);
    return res.status(502).json({
      code: "UPLOAD_FAILED",
      message: "We could not upload your photo. Please try again.",
    });
  }

  await prisma.claimAttempt.update({
    where: { id: attempt.id },
    data: {
      imageUrl: uploadResult.url,
      imageBlobName: blobName,
      imageMimeType: file.mimetype,
      imageSizeBytes: file.size,
      submittedAt: new Date(),
      status: "SUBMITTED",
    },
  });

  // Run AI judging. Failures keep the attempt in SUBMITTED for admin review.
  try {
    const sasUrl = getReadSasUrl(blobName);
    const judgement = await judgeImage({
      taskPrompt: attempt.taskPrompt,
      imageUrl: sasUrl,
    });
    await prisma.claimAttempt.update({
      where: { id: attempt.id },
      data: {
        aiPassed: judgement.passed,
        aiConfidence: judgement.confidence,
        aiFeedback: judgement.feedback,
        aiRawResponse: judgement.rawResponse,
        reviewedAt: new Date(),
      },
    });
    if (judgement.passed) {
      await approveClaim(attempt.id);
    } else {
      await rejectClaim(attempt.id, judgement.feedback);
    }
  } catch (err) {
    console.error("[upload] AI judging failed - leaving attempt in SUBMITTED:", err);
    await prisma.claimAttempt.update({
      where: { id: attempt.id },
      data: {
        aiFeedback:
          "The AI judge could not review this photo. An admin will review it manually.",
      },
    });
  }

  const final = await prisma.claimAttempt.findUnique({
    where: { id: attempt.id },
    include: { astronaut: true, claim: true },
  });

  return res.json({
    attemptId: attempt.id,
    status: final?.status,
    aiPassed: final?.aiPassed,
    aiFeedback: final?.aiFeedback,
    claimed: !!final?.claim,
  });
}
