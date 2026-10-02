import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, publicProcedure, router } from "../index";
import { buildActivityTiming, getOrCreateActivity } from "../services/activity";
import { assignTeams } from "../services/kickoff/assign-teams";

export const kickoffRouter = router({
  getDisplayState: publicProcedure.query(async ({ ctx }) => {
    const current = await getOrCreateActivity();
    return ctx.prisma.$transaction(async (tx) => {
      const [activity, teams, players] = await Promise.all([
        tx.activity.findUniqueOrThrow({ where: { id: current.id } }),
        tx.team.findMany({
          orderBy: { name: "asc" },
          include: {
            players: {
              orderBy: { name: "asc" },
              include: { authUser: { select: { username: true } } },
            },
          },
        }),
        tx.player.findMany({
          orderBy: { name: "asc" },
          include: { authUser: { select: { username: true } } },
        }),
      ]);
      return {
        status: activity.status,
        assignmentBatchId: activity.assignmentBatchId,
        ...buildActivityTiming(activity),
        teams: teams.map((team) => ({
          id: team.id,
          name: team.name,
          color: team.color,
          icon: team.icon,
          players: team.players.map((player) => ({
            id: player.id,
            name: player.authUser?.username ?? player.name,
          })),
        })),
        unassignedPlayers: players.filter((player) => !player.teamId).map((player) => ({
          id: player.id,
          name: player.authUser?.username ?? player.name,
        })),
        assignedCount: players.filter((player) => player.teamId).length,
        totalPlayers: players.length,
      };
    });
  }),

  startAssignment: adminProcedure.mutation(async ({ ctx }) => {
    const current = await getOrCreateActivity();
    return ctx.prisma.$transaction(async (tx) => {
      const activity = await tx.activity.findUniqueOrThrow({ where: { id: current.id } });
      if (activity.status === "TEAM_ASSIGNMENT" || activity.status === "ACTIVE") {
        return activity;
      }
      if (activity.status !== "SETUP") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot start team assignment from current state.",
        });
      }
      return tx.activity.update({
        where: { id: activity.id },
        data: { status: "TEAM_ASSIGNMENT" },
      });
    });
  }),

  assignTeams: adminProcedure.mutation(({ ctx }) => ctx.prisma.$transaction(assignTeams)),

  resetAssignments: adminProcedure.mutation(async ({ ctx }) => {
    const current = await getOrCreateActivity();
    await ctx.prisma.$transaction(async (tx) => {
      const activity = await tx.activity.findUniqueOrThrow({ where: { id: current.id } });
      if (activity.status === "ACTIVE" || activity.status === "FINISHED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot reset assignments while the activity is active.",
        });
      }
      await tx.player.updateMany({ data: { teamId: null } });
      await tx.activity.update({ where: { id: activity.id }, data: { assignmentBatchId: null } });
    });
    return { ok: true };
  }),

  beginActivity: adminProcedure
    .input(z.object({ timeLimitMinutes: z.number().int().positive().max(24 * 60) }))
    .mutation(async ({ ctx, input }) => {
      const current = await getOrCreateActivity();
      return ctx.prisma.$transaction(async (tx) => {
        const activity = await tx.activity.findUniqueOrThrow({ where: { id: current.id } });
        if (activity.status === "ACTIVE") return activity;
        if (activity.status !== "TEAM_ASSIGNMENT") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Team assignment must be in progress before beginning the activity.",
          });
        }
        const unassigned = await tx.player.count({ where: { teamId: null } });
        if (unassigned > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `${unassigned} player(s) are not yet assigned to a team.`,
          });
        }
        return tx.activity.update({
          where: { id: activity.id },
          data: {
            status: "ACTIVE",
            startedAt: new Date(),
            timeLimitMinutes: input.timeLimitMinutes,
          },
        });
      });
    }),
});
