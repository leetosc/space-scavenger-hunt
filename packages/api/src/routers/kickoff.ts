import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, publicProcedure, router } from "../index";
import { buildActivityTiming, getOrCreateActivity } from "../services/activity";
import {
  assignNextPlayer,
  autoAssignRemaining,
} from "../services/kickoff/assign-next-player";

export const kickoffRouter = router({
  getDisplayState: publicProcedure.query(async ({ ctx }) => {
    const [activity, teams, players] = await Promise.all([
      getOrCreateActivity(),
      ctx.prisma.team.findMany({
        orderBy: { name: "asc" },
        include: { players: { orderBy: { name: "asc" } } },
      }),
      ctx.prisma.player.findMany({ orderBy: { name: "asc" } }),
    ]);
    return {
      status: activity.status,
      ...buildActivityTiming(activity),
      teams: teams.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        icon: t.icon,
        players: t.players.map((p) => ({ id: p.id, name: p.name })),
      })),
      unassignedPlayers: players.filter((p) => !p.teamId).map((p) => ({ id: p.id, name: p.name })),
      assignedCount: players.filter((p) => p.teamId).length,
      totalPlayers: players.length,
    };
  }),

  startAssignment: adminProcedure.mutation(async ({ ctx }) => {
    const activity = await getOrCreateActivity();
    if (activity.status === "TEAM_ASSIGNMENT" || activity.status === "ACTIVE") {
      return activity;
    }
    if (activity.status !== "SETUP") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot start team assignment from current state.",
      });
    }
    return ctx.prisma.activity.update({
      where: { id: activity.id },
      data: { status: "TEAM_ASSIGNMENT" },
    });
  }),

  spinNextPlayer: adminProcedure.mutation(async () => {
    return assignNextPlayer();
  }),

  autoAssignRemaining: adminProcedure.mutation(async () => {
    await autoAssignRemaining();
    return { ok: true };
  }),

  resetAssignments: adminProcedure.mutation(async ({ ctx }) => {
    const activity = await getOrCreateActivity();
    if (activity.status === "ACTIVE" || activity.status === "FINISHED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot reset assignments while the activity is active.",
      });
    }
    await ctx.prisma.player.updateMany({ data: { teamId: null } });
    return { ok: true };
  }),

  beginActivity: adminProcedure
    .input(z.object({ timeLimitMinutes: z.number().int().positive().max(24 * 60) }))
    .mutation(async ({ ctx, input }) => {
      const activity = await getOrCreateActivity();
      if (activity.status === "ACTIVE") return activity;
      if (activity.status !== "TEAM_ASSIGNMENT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team assignment must be in progress before beginning the activity.",
        });
      }
      const unassigned = await ctx.prisma.player.count({ where: { teamId: null } });
      if (unassigned > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${unassigned} player(s) are not yet assigned to a team.`,
        });
      }
      return ctx.prisma.activity.update({
        where: { id: activity.id },
        data: {
          status: "ACTIVE",
          startedAt: new Date(),
          timeLimitMinutes: input.timeLimitMinutes,
        },
      });
    }),
});
