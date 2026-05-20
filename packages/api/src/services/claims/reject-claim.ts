import prisma from "@space-scavenger-hunt/db";

export async function rejectClaim(attemptId: string, feedback?: string) {
  return prisma.claimAttempt.update({
    where: { id: attemptId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      aiFeedback: feedback ?? undefined,
    },
  });
}
