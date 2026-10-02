import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, playerProcedure, router } from "../index";
import { deleteBlob } from "../services/azure-blob";
import {
  grantBoosts,
  INITIAL_SIGNAL_BOOSTS,
  removeAvailableBoosts,
  spendBoost,
} from "../services/boosts";
import { getHintPhotoPreviewPath } from "../services/hint-photo-url";

export const MAX_HINT_REVEAL_LEVEL = 3;

function withPreviewUrl<T extends { id: string; imageBlobName: string | null }>(hint: T) {
  return {
    ...hint,
    previewUrl: hint.imageBlobName ? getHintPhotoPreviewPath(hint.id) : undefined,
  };
}

export const hintRouter = router({
  listForTeam: playerProcedure.query(async ({ ctx }) => {
    const teamId = ctx.player.teamId;
    if (!teamId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You are not assigned to a team." });
    }
    const [team, hints, reveals] = await Promise.all([
      ctx.prisma.team.findUniqueOrThrow({ where: { id: teamId } }),
      ctx.prisma.locationHint.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      ctx.prisma.teamLocationHintReveal.findMany({ where: { teamId } }),
    ]);
    const byId = new Map(reveals.map((reveal) => [reveal.locationHintId, reveal]));
    return {
      balance: team.signalBoostBalance,
      maxRevealLevel: MAX_HINT_REVEAL_LEVEL,
      hints: hints.map((hint) => ({
        ...withPreviewUrl(hint),
        revealLevel: byId.get(hint.id)?.revealLevel ?? 0,
        lastSpentAt: byId.get(hint.id)?.lastSpentAt ?? null,
      })),
    };
  }),

  spendSignalBoost: playerProcedure
    .input(z.object({ locationHintId: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      const teamId = ctx.player.teamId;
      if (!teamId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You are not assigned to a team." });
      }
      return ctx.prisma.$transaction((tx) => spendBoost(tx, teamId, input.locationHintId));
    }),

  adminList: adminProcedure.query(async ({ ctx }) => {
    const [hints, teams] = await Promise.all([
      ctx.prisma.locationHint.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          reveals: {
            include: { team: { select: { id: true, name: true, color: true, icon: true } } },
            orderBy: { updatedAt: "desc" },
          },
        },
      }),
      ctx.prisma.team.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, color: true, icon: true, signalBoostBalance: true },
      }),
    ]);
    return { maxRevealLevel: MAX_HINT_REVEAL_LEVEL, hints: hints.map(withPreviewUrl), teams };
  }),

  adminLedger: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(40) }).optional())
    .query(({ ctx, input }) => {
      return ctx.prisma.signalBoostLedger.findMany({
        where: { archivedAt: null },
        take: input?.limit ?? 40,
        orderBy: { createdAt: "desc" },
        include: {
          team: { select: { id: true, name: true, color: true, icon: true } },
          locationHint: { select: { id: true, title: true } },
        },
      });
    }),

  adminClearLedger: adminProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.prisma.signalBoostLedger.updateMany({
      where: { archivedAt: null },
      data: { archivedAt: new Date() },
    });
    return { deletedCount: result.count };
  }),

  adminSetTeamRevealLevel: adminProcedure
    .input(z.object({
      teamId: z.string().min(1),
      locationHintId: z.string().min(1),
      revealLevel: z.number().int().min(0).max(MAX_HINT_REVEAL_LEVEL),
    }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx) => {
        const reveal = await tx.teamLocationHintReveal.upsert({
          where: {
            teamId_locationHintId: {
              teamId: input.teamId,
              locationHintId: input.locationHintId,
            },
          },
          create: { ...input, version: 1 },
          update: { revealLevel: input.revealLevel, version: { increment: 1 } },
        });
        const team = await tx.team.findUniqueOrThrow({ where: { id: input.teamId } });
        await tx.signalBoostLedger.create({
          data: {
            teamId: input.teamId,
            locationHintId: input.locationHintId,
            type: "ADMIN_REVEAL",
            delta: 0,
            balanceAfter: team.signalBoostBalance,
            note: `Admin set reveal level to ${input.revealLevel}. Earlier spends no longer affect this reveal.`,
          },
        });
        return {
          teamId: reveal.teamId,
          locationHintId: reveal.locationHintId,
          revealLevel: reveal.revealLevel,
        };
      });
    }),

  adminCreatePlaceholder: adminProcedure
    .input(z.object({
      title: z.string().trim().max(100).nullable().optional(),
      description: z.string().trim().max(500).optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sortOrder = input.sortOrder ??
        ((await ctx.prisma.locationHint.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? 0) + 1;
      return ctx.prisma.locationHint.create({
        data: { title: input.title || null, description: input.description || null, sortOrder },
      });
    }),

  adminUpdate: adminProcedure
    .input(z.object({
      id: z.string().min(1),
      title: z.string().trim().max(100).nullable().optional(),
      description: z.string().trim().max(500).nullable().optional(),
      active: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.locationHint.update({ where: { id }, data });
    }),

  adminDelete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const hint = await ctx.prisma.locationHint.findUnique({ where: { id: input.id } });
      if (!hint) throw new TRPCError({ code: "NOT_FOUND", message: "Hint not found." });
      if (hint.imageBlobName) await deleteBlob(hint.imageBlobName);
      await ctx.prisma.locationHint.delete({ where: { id: input.id } });
      return { deleted: true };
    }),

  adminAdjustTeamBoosts: adminProcedure
    .input(z.object({
      teamId: z.string().min(1),
      delta: z.number().int().min(-100).max(100),
      note: z.string().trim().max(300).optional(),
    }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx) => {
        if (!input.delta) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Adjustment cannot be zero." });
        }
        const team = input.delta > 0
          ? await grantBoosts(tx, input.teamId, input.delta, "ADMIN_ADJUSTMENT", input.note || "Admin grant")
          : await removeAvailableBoosts(tx, input.teamId, -input.delta, input.note || "Admin adjustment");
        return { teamId: team.id, balance: team.signalBoostBalance };
      });
    }),

  adminGrantInitialToTeam: adminProcedure
    .input(z.object({ teamId: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx) => {
        const team = await tx.team.findUniqueOrThrow({ where: { id: input.teamId } });
        const delta = INITIAL_SIGNAL_BOOSTS - team.signalBoostBalance;
        if (delta > 0) {
          return grantBoosts(tx, team.id, delta, "INITIAL_GRANT", "Reset balance to two starting boosts.");
        }
        if (delta < 0) {
          return removeAvailableBoosts(tx, team.id, -delta, "Reset balance to two starting boosts.");
        }
        return team;
      });
    }),
});
