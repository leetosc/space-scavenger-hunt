import type { Prisma } from "@space-scavenger-hunt/db";
import { TRPCError } from "@trpc/server";

type Tx = Prisma.TransactionClient;
export const INITIAL_SIGNAL_BOOSTS = 2;

export async function grantBoosts(
  tx: Tx,
  teamId: string,
  amount: number,
  type: string,
  note: string,
  source?: { selfieId?: string; claimId?: string },
) {
  const team = await tx.team.update({
    where: { id: teamId },
    data: { signalBoostBalance: { increment: amount } },
  });
  const ledger = await tx.signalBoostLedger.create({
    data: {
      teamId,
      type,
      delta: amount,
      balanceAfter: team.signalBoostBalance,
      note,
      claimId: source?.claimId,
    },
  });
  await tx.signalBoostCredit.createMany({
    data: Array.from({ length: amount }, () => ({
      teamId,
      grantLedgerId: ledger.id,
      selfieId: source?.selfieId,
    })),
  });
  return team;
}

// Negative admin adjustments consume credits too, but do not buy a reveal.
export async function removeAvailableBoosts(
  tx: Tx,
  teamId: string,
  amount: number,
  note: string,
) {
  const credits = await tx.signalBoostCredit.findMany({
    where: { teamId, state: "AVAILABLE" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: amount,
  });
  if (credits.length !== amount) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Adjustment would make the balance negative.",
    });
  }
  const removed = await tx.signalBoostCredit.updateMany({
    where: { id: { in: credits.map((credit) => credit.id) }, state: "AVAILABLE" },
    data: { state: "REMOVED" },
  });
  if (removed.count !== amount) {
    throw new TRPCError({ code: "CONFLICT", message: "The balance changed. Please try again." });
  }
  const team = await tx.team.update({
    where: { id: teamId },
    data: { signalBoostBalance: { decrement: amount } },
  });
  await tx.signalBoostLedger.create({
    data: {
      teamId,
      type: "ADMIN_ADJUSTMENT",
      delta: -amount,
      balanceAfter: team.signalBoostBalance,
      note,
    },
  });
  return team;
}

export async function spendBoost(tx: Tx, teamId: string, locationHintId: string) {
  const hint = await tx.locationHint.findUnique({ where: { id: locationHintId } });
  if (!hint?.active) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Hint not found." });
  }
  const key = { teamId_locationHintId: { teamId, locationHintId } };
  const existing = await tx.teamLocationHintReveal.findUnique({ where: key });
  if ((existing?.revealLevel ?? 0) >= 3) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This location photo is already fully revealed.",
    });
  }
  const credit = await tx.signalBoostCredit.findFirst({
    where: { teamId, state: "AVAILABLE" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  if (!credit) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Your team is out of Signal Boosts." });
  }
  const consumed = await tx.signalBoostCredit.updateMany({
    where: { id: credit.id, state: "AVAILABLE" },
    data: { state: "SPENT" },
  });
  if (consumed.count !== 1) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "A teammate just used this boost. Please try again.",
    });
  }
  const reveal = await tx.teamLocationHintReveal.upsert({
    where: key,
    create: { teamId, locationHintId, revealLevel: 1, lastSpentAt: new Date() },
    update: { revealLevel: { increment: 1 }, lastSpentAt: new Date() },
  });
  const team = await tx.team.update({
    where: { id: teamId },
    data: { signalBoostBalance: { decrement: 1 } },
  });
  const ledger = await tx.signalBoostLedger.create({
    data: {
      teamId,
      locationHintId,
      type: "HINT_SPEND",
      delta: -1,
      balanceAfter: team.signalBoostBalance,
      note: `Revealed location photo to level ${reveal.revealLevel}.`,
    },
  });
  await tx.signalBoostCredit.update({
    where: { id: credit.id },
    data: { spendLedgerId: ledger.id, locationHintId, revealVersion: reveal.version },
  });
  return {
    balance: team.signalBoostBalance,
    locationHintId,
    revealLevel: reveal.revealLevel,
    maxRevealLevel: 3,
  };
}

export async function revokeSelfieBoost(tx: Tx, selfieId: string) {
  const credit = await tx.signalBoostCredit.findUnique({ where: { selfieId } });
  if (!credit || credit.state === "REVOKED") return;

  let reversed = false;
  if (credit.state === "SPENT" && credit.locationHintId) {
    // Admin reveal overrides start a new version, so old spends cannot undo them.
    const result = await tx.teamLocationHintReveal.updateMany({
      where: {
        teamId: credit.teamId,
        locationHintId: credit.locationHintId,
        version: credit.revealVersion ?? -1,
        revealLevel: { gt: 0 },
      },
      data: { revealLevel: { decrement: 1 } },
    });
    reversed = result.count === 1;
  }

  const delta = credit.state === "AVAILABLE" ? -1 : 0;
  const team = await tx.team.update({
    where: { id: credit.teamId },
    data: { signalBoostBalance: { increment: delta } },
  });
  await tx.signalBoostCredit.update({
    where: { id: credit.id },
    data: { state: "REVOKED", revokedAt: new Date() },
  });
  await tx.signalBoostLedger.create({
    data: {
      teamId: credit.teamId,
      locationHintId: credit.locationHintId,
      type: "SELFIE_REVOKED",
      delta,
      balanceAfter: team.signalBoostBalance,
      note: reversed
        ? "Selfie rejected; its purchased reveal step was reversed."
        : delta
          ? "Selfie rejected; unused boost removed."
          : "Selfie rejected; boost had already been removed or its reveal was overridden/deleted.",
    },
  });
}
