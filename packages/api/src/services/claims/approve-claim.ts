import prisma from "@space-scavenger-hunt/db";

export type ApproveClaimResult = {
  attemptId: string;
  claimId: string;
  alreadyClaimed: boolean;
};

export async function approveClaim(attemptId: string): Promise<ApproveClaimResult> {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.claimAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) {
      throw new Error("Attempt not found.");
    }

    const activity = await tx.activity.findFirst({ orderBy: { createdAt: "asc" } });
    const claimedAt = new Date();
    const claimedElapsedSeconds = activity?.startedAt
      ? Math.max(0, Math.floor((claimedAt.getTime() - activity.startedAt.getTime()) / 1000))
      : null;

    const existing = await tx.teamClaim.findUnique({
      where: {
        teamId_astronautId: {
          teamId: attempt.teamId,
          astronautId: attempt.astronautId,
        },
      },
    });

    let claimId: string;
    if (existing) {
      claimId = existing.id;
      const existingElapsedSeconds = activity?.startedAt
        ? Math.max(
            0,
            Math.floor((existing.claimedAt.getTime() - activity.startedAt.getTime()) / 1000),
          )
        : null;
      if (existing.claimedElapsedSeconds === null && existingElapsedSeconds !== null) {
        await tx.teamClaim.update({
          where: { id: existing.id },
          data: { claimedElapsedSeconds: existingElapsedSeconds },
        });
      }
    } else {
      const created = await tx.teamClaim.create({
        data: {
          teamId: attempt.teamId,
          astronautId: attempt.astronautId,
          claimAttemptId: attempt.id,
          claimedAt,
          claimedElapsedSeconds,
        },
      });
      claimId = created.id;
    }

    await tx.claimAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
      },
    });

    return { attemptId: attempt.id, claimId, alreadyClaimed: Boolean(existing) };
  });
}
