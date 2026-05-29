import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";

import { adminProcedure, playerProcedure, publicProcedure, router } from "../index";
import { DEFAULT_MAX_TEAMS, getOrCreateActivity } from "../services/activity";

export const teamRouter = router({
  getConfig: publicProcedure.query(async () => {
    const activity = await getOrCreateActivity();
    return { maxTeams: activity.maxTeams ?? DEFAULT_MAX_TEAMS };
  }),

  list: publicProcedure.query(async ({ ctx }) => {
    const [teams, boostSpendByTeam] = await Promise.all([
      ctx.prisma.team.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: { select: { players: true, assignments: true, claims: true } },
        },
      }),
      ctx.prisma.signalBoostLedger.groupBy({
        by: ["teamId"],
        where: { type: "HINT_SPEND", delta: { lt: 0 } },
        _sum: { delta: true },
      }),
    ]);

    const boostsUsedByTeamId = new Map(
      boostSpendByTeam.map((entry) => [
        entry.teamId,
        Math.abs(entry._sum.delta ?? 0),
      ]),
    );

    return teams.map((team) => ({
      ...team,
      signalBoostsUsed: boostsUsedByTeamId.get(team.id) ?? 0,
    }));
  }),

  getMyTeam: playerProcedure.query(async ({ ctx }) => {
    if (!ctx.player.teamId) return null;
    return ctx.prisma.team.findUnique({
      where: { id: ctx.player.teamId },
      include: {
        players: { orderBy: { name: "asc" } },
        assignments: { include: { astronaut: true } },
        claims: { include: { astronaut: true } },
      },
    });
  }),

  getDashboard: playerProcedure.query(async ({ ctx }) => {
    if (!ctx.player.teamId) return null;
    const team = await ctx.prisma.team.findUnique({
      where: { id: ctx.player.teamId },
      include: {
        players: { orderBy: { name: "asc" } },
        assignments: { include: { astronaut: true } },
        claims: {
          include: { astronaut: true, claimAttempt: true },
          orderBy: { claimedAt: "desc" },
        },
      },
    });
    if (!team) return null;
    const assignedCount = team.assignments.length;
    const claimedCount = team.claims.length;
    return {
      team: {
        id: team.id,
        name: team.name,
        color: team.color,
        icon: team.icon,
        signalBoostBalance: team.signalBoostBalance,
      },
      players: team.players.map((p) => ({ id: p.id, name: p.name })),
      assignedCount,
      claimedCount,
      progress: assignedCount > 0 ? claimedCount / assignedCount : 0,
      claims: team.claims.map((c) => ({
        astronautId: c.astronautId,
        astronautName: c.astronaut.name,
        claimedAt: c.claimedAt,
      })),
    };
  }),

  updateMine: playerProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(60),
        icon: z.string().max(40),
      }),
    )
    .mutation(({ ctx, input }) => {
      if (!ctx.player.teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are not assigned to a team.",
        });
      }

      return ctx.prisma.team.update({
        where: { id: ctx.player.teamId },
        data: {
          name: input.name,
          icon: input.icon,
        },
      });
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(60),
        color: z.string().max(40).optional(),
        icon: z.string().max(40).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const activity = await getOrCreateActivity();
      const maxTeams = activity.maxTeams ?? DEFAULT_MAX_TEAMS;
      const count = await ctx.prisma.team.count();
      if (count >= maxTeams) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `There are already ${maxTeams} teams.`,
        });
      }
      return ctx.prisma.$transaction(async (tx) => {
        const team = await tx.team.create({
          data: {
            name: input.name,
            color: input.color,
            icon: input.icon,
            signalBoostBalance: 2,
            joinCode: nanoid(10),
          },
        });
        await tx.signalBoostLedger.create({
          data: {
            teamId: team.id,
            type: "INITIAL_GRANT",
            delta: 2,
            balanceAfter: team.signalBoostBalance,
            note: "Starting Signal Boosts",
          },
        });
        return team;
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(60).optional(),
        color: z.string().max(40).optional(),
        icon: z.string().max(40).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...rest } = input;
      return ctx.prisma.team.update({ where: { id }, data: rest });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.team.delete({ where: { id: input.id } });
      return { deleted: true };
    }),
});
