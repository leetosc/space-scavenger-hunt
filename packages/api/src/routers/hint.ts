import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, playerProcedure, router } from "../index";
import { deleteBlob } from "../services/azure-blob";
import { getHintPhotoPreviewPath } from "../services/hint-photo-url";

export const MAX_HINT_REVEAL_LEVEL = 3;
const INITIAL_SIGNAL_BOOSTS = 2;

function withPreviewUrl<T extends { id: string; imageBlobName: string | null }>(hint: T) {
  return {
    ...hint,
    previewUrl: hint.imageBlobName ? getHintPhotoPreviewPath(hint.id) : undefined,
  };
}

function clampRevealLevel(revealLevel: number) {
  return Math.min(MAX_HINT_REVEAL_LEVEL, Math.max(0, revealLevel));
}

export const hintRouter = router({
  listForTeam: playerProcedure.query(async ({ ctx }) => {
    if (!ctx.player.teamId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You are not assigned to a team.",
      });
    }

    const [team, hints, reveals] = await Promise.all([
      ctx.prisma.team.findUnique({
        where: { id: ctx.player.teamId },
        select: { id: true, signalBoostBalance: true },
      }),
      ctx.prisma.locationHint.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      ctx.prisma.teamLocationHintReveal.findMany({
        where: { teamId: ctx.player.teamId },
      }),
    ]);

    if (!team) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });
    }

    const revealByHintId = new Map(reveals.map((reveal) => [reveal.locationHintId, reveal]));
    return {
      balance: team.signalBoostBalance,
      maxRevealLevel: MAX_HINT_REVEAL_LEVEL,
      hints: hints.map((hint) => {
        const reveal = revealByHintId.get(hint.id);
        return {
          ...withPreviewUrl(hint),
          revealLevel: clampRevealLevel(reveal?.revealLevel ?? 0),
          lastSpentAt: reveal?.lastSpentAt ?? null,
        };
      }),
    };
  }),

  spendSignalBoost: playerProcedure
    .input(z.object({ locationHintId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.player.teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are not assigned to a team.",
        });
      }
      const teamId = ctx.player.teamId;

      return ctx.prisma.$transaction(async (tx) => {
        const hint = await tx.locationHint.findUnique({
          where: { id: input.locationHintId },
          select: { id: true, active: true },
        });
        if (!hint?.active) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Hint not found." });
        }

        const existingReveal = await tx.teamLocationHintReveal.findUnique({
          where: {
            teamId_locationHintId: {
              teamId,
              locationHintId: hint.id,
            },
          },
        });
        const currentRevealLevel = existingReveal?.revealLevel ?? 0;
        if (currentRevealLevel >= MAX_HINT_REVEAL_LEVEL) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This location photo is already fully revealed.",
          });
        }

        const spend = await tx.team.updateMany({
          where: { id: teamId, signalBoostBalance: { gt: 0 } },
          data: { signalBoostBalance: { decrement: 1 } },
        });
        if (spend.count !== 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Your team is out of Signal Boosts.",
          });
        }

        const team = await tx.team.findUniqueOrThrow({
          where: { id: teamId },
          select: { signalBoostBalance: true },
        });
        const now = new Date();
        const reveal = await tx.teamLocationHintReveal.upsert({
          where: {
            teamId_locationHintId: {
              teamId,
              locationHintId: hint.id,
            },
          },
          create: {
            teamId,
            locationHintId: hint.id,
            revealLevel: currentRevealLevel + 1,
            lastSpentAt: now,
          },
          update: {
            revealLevel: { increment: 1 },
            lastSpentAt: now,
          },
        });

        await tx.signalBoostLedger.create({
          data: {
            teamId,
            locationHintId: hint.id,
            type: "HINT_SPEND",
            delta: -1,
            balanceAfter: team.signalBoostBalance,
            note: `Revealed location photo to level ${reveal.revealLevel}.`,
          },
        });

        return {
          balance: team.signalBoostBalance,
          locationHintId: hint.id,
          revealLevel: reveal.revealLevel,
          maxRevealLevel: MAX_HINT_REVEAL_LEVEL,
        };
      });
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

    return {
      maxRevealLevel: MAX_HINT_REVEAL_LEVEL,
      hints: hints.map((hint) => ({
        ...withPreviewUrl(hint),
        reveals: hint.reveals.map((reveal) => ({
          ...reveal,
          revealLevel: clampRevealLevel(reveal.revealLevel),
        })),
      })),
      teams,
    };
  }),

  adminLedger: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(40) }).optional())
    .query(({ ctx, input }) => {
      return ctx.prisma.signalBoostLedger.findMany({
        take: input?.limit ?? 40,
        orderBy: { createdAt: "desc" },
        include: {
          team: { select: { id: true, name: true, color: true, icon: true } },
          locationHint: { select: { id: true, title: true } },
        },
      });
    }),

  adminClearLedger: adminProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.prisma.signalBoostLedger.deleteMany();
    return { deletedCount: result.count };
  }),

  adminSetTeamRevealLevel: adminProcedure
    .input(
      z.object({
        teamId: z.string().min(1),
        locationHintId: z.string().min(1),
        revealLevel: z.number().int().min(0).max(MAX_HINT_REVEAL_LEVEL),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const hint = await ctx.prisma.locationHint.findUnique({
        where: { id: input.locationHintId },
        select: { id: true },
      });
      if (!hint) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Hint not found." });
      }

      const team = await ctx.prisma.team.findUnique({
        where: { id: input.teamId },
        select: { id: true },
      });
      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });
      }

      if (input.revealLevel === 0) {
        await ctx.prisma.teamLocationHintReveal.deleteMany({
          where: {
            teamId: input.teamId,
            locationHintId: input.locationHintId,
          },
        });

        return {
          teamId: input.teamId,
          locationHintId: input.locationHintId,
          revealLevel: 0,
        };
      }

      const reveal = await ctx.prisma.teamLocationHintReveal.upsert({
        where: {
          teamId_locationHintId: {
            teamId: input.teamId,
            locationHintId: input.locationHintId,
          },
        },
        create: {
          teamId: input.teamId,
          locationHintId: input.locationHintId,
          revealLevel: input.revealLevel,
        },
        update: {
          revealLevel: input.revealLevel,
        },
      });

      return {
        teamId: reveal.teamId,
        locationHintId: reveal.locationHintId,
        revealLevel: clampRevealLevel(reveal.revealLevel),
      };
    }),

  adminCreatePlaceholder: adminProcedure
    .input(
      z.object({
        title: z.string().trim().max(100).nullable().optional(),
        description: z.string().trim().max(500).optional(),
        sortOrder: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sortOrder =
        input.sortOrder ??
        ((await ctx.prisma.locationHint.aggregate({ _max: { sortOrder: true } }))._max
          .sortOrder ?? 0) + 1;
      return ctx.prisma.locationHint.create({
        data: {
          title: input.title || null,
          description: input.description || null,
          sortOrder,
        },
      });
    }),

  adminUpdate: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        title: z.string().trim().max(100).nullable().optional(),
        description: z.string().trim().max(500).nullable().optional(),
        active: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.locationHint.update({ where: { id }, data });
    }),

  adminDelete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const hint = await ctx.prisma.locationHint.findUnique({
        where: { id: input.id },
        select: { imageBlobName: true },
      });
      if (!hint) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Hint not found." });
      }
      if (hint.imageBlobName) {
        await deleteBlob(hint.imageBlobName);
      }
      await ctx.prisma.locationHint.delete({ where: { id: input.id } });
      return { deleted: true };
    }),

  adminAdjustTeamBoosts: adminProcedure
    .input(
      z.object({
        teamId: z.string().min(1),
        delta: z.number().int().min(-100).max(100),
        note: z.string().trim().max(300).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.delta === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Adjustment cannot be zero." });
      }

      return ctx.prisma.$transaction(async (tx) => {
        if (input.delta < 0) {
          const updated = await tx.team.updateMany({
            where: { id: input.teamId, signalBoostBalance: { gte: Math.abs(input.delta) } },
            data: { signalBoostBalance: { increment: input.delta } },
          });
          if (updated.count !== 1) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Adjustment would make the balance negative.",
            });
          }
        } else {
          await tx.team.update({
            where: { id: input.teamId },
            data: { signalBoostBalance: { increment: input.delta } },
          });
        }

        const team = await tx.team.findUniqueOrThrow({
          where: { id: input.teamId },
          select: { signalBoostBalance: true },
        });
        await tx.signalBoostLedger.create({
          data: {
            teamId: input.teamId,
            type: "ADMIN_ADJUSTMENT",
            delta: input.delta,
            balanceAfter: team.signalBoostBalance,
            note: input.note || null,
          },
        });
        return { teamId: input.teamId, balance: team.signalBoostBalance };
      });
    }),

  adminGrantInitialToTeam: adminProcedure
    .input(z.object({ teamId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx) => {
        const team = await tx.team.update({
          where: { id: input.teamId },
          data: { signalBoostBalance: INITIAL_SIGNAL_BOOSTS },
          select: { id: true, signalBoostBalance: true },
        });
        await tx.signalBoostLedger.create({
          data: {
            teamId: team.id,
            type: "INITIAL_GRANT",
            delta: INITIAL_SIGNAL_BOOSTS,
            balanceAfter: team.signalBoostBalance,
            note: "Reset to starting Signal Boosts.",
          },
        });
        return team;
      });
    }),
});
