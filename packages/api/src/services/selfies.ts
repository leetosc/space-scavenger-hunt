import type { Prisma } from "@space-scavenger-hunt/db";
import { TRPCError } from "@trpc/server";

import { grantBoosts, revokeSelfieBoost } from "./boosts";

export async function approveSelfie(
  tx: Prisma.TransactionClient,
  id: string,
  reviewedBy?: string,
) {
  const selfie = await tx.birthdaySelfie.findUniqueOrThrow({ where: { id } });
  if (selfie.status === "APPROVED") {
    if (reviewedBy && !selfie.reviewedBy) {
      await tx.selfieReview.create({
        data: { selfieId: id, reviewerId: reviewedBy, decision: "APPROVED" },
      });
      return tx.birthdaySelfie.update({
        where: { id },
        data: { reviewedBy, reviewedAt: new Date() },
      });
    }
    return selfie;
  }
  if (
    !["PROCESSING", "PENDING_REVIEW", "AI_REJECTED"].includes(selfie.status) ||
    !selfie.imageBlobName
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This submission cannot be approved. The player may upload a replacement.",
    });
  }

  const activeKey = `${selfie.playerId}:${selfie.twin}`;
  const other = await tx.birthdaySelfie.findUnique({ where: { activeKey } });
  if (other && other.id !== id) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This player already has a replacement pending or approved for this twin.",
    });
  }
  const updated = await tx.birthdaySelfie.update({
    where: { id },
    data: {
      status: "APPROVED",
      activeKey,
      reviewedBy,
      reviewedAt: reviewedBy ? new Date() : undefined,
    },
  });
  await grantBoosts(
    tx,
    selfie.teamId,
    1,
    "SELFIE_REWARD",
    `Selfie with ${selfie.twin === "LUKE" ? "Luke" : "Leo"}`,
    { selfieId: id },
  );
  if (reviewedBy) {
    await tx.selfieReview.create({
      data: { selfieId: id, reviewerId: reviewedBy, decision: "APPROVED" },
    });
  }
  return updated;
}

export async function rejectSelfie(
  tx: Prisma.TransactionClient,
  id: string,
  reviewedBy: string,
  reason: string,
) {
  const selfie = await tx.birthdaySelfie.findUniqueOrThrow({ where: { id } });
  if (selfie.status === "REJECTED") return selfie;

  await revokeSelfieBoost(tx, id);
  await tx.selfieReview.create({
    data: { selfieId: id, reviewerId: reviewedBy, decision: "REJECTED", reason },
  });
  return tx.birthdaySelfie.update({
    where: { id },
    data: {
      status: "REJECTED",
      activeKey: null,
      reviewedBy,
      reviewedAt: new Date(),
      rejectionReason: reason,
    },
  });
}

export async function applySelfieJudgement(
  tx: Prisma.TransactionClient,
  id: string,
  judgement: { passed: boolean; confidence: number; feedback: string },
) {
  const current = await tx.birthdaySelfie.findUniqueOrThrow({ where: { id } });
  await tx.birthdaySelfie.update({
    where: { id },
    data: {
      aiPassed: judgement.passed,
      aiFeedback: judgement.feedback,
      aiConfidence: judgement.confidence,
    },
  });
  // Preserve a human decision or a prior completed AI decision if this request finished late.
  if (current.status !== "PROCESSING") return;

  if (judgement.passed) {
    await approveSelfie(tx, id);
  } else {
    await tx.birthdaySelfie.update({
      where: { id },
      data: { status: "AI_REJECTED", activeKey: null },
    });
  }
}
