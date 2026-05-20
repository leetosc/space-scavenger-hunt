import { TRPCError } from "@trpc/server";

import { adminProcedure, publicProcedure, router } from "../index";
import { getOrCreateActivity } from "../services/activity";

export const activityRouter = router({
  getCurrent: publicProcedure.query(async () => {
    return getOrCreateActivity();
  }),

  getState: publicProcedure.query(async () => {
    const activity = await getOrCreateActivity();
    return { id: activity.id, name: activity.name, status: activity.status };
  }),

  validateSetup: adminProcedure.query(async ({ ctx }) => {
    const [activity, teams, players, astronauts, assignments, unassignedPlayers] = await Promise.all(
      [
        getOrCreateActivity(),
        ctx.prisma.team.count(),
        ctx.prisma.player.count(),
        ctx.prisma.astronaut.findMany({ where: { active: true }, select: { id: true } }),
        ctx.prisma.teamAstronautAssignment.findMany({
          select: { astronautId: true, teamId: true },
        }),
        ctx.prisma.player.count({ where: { teamId: null } }),
      ],
    );

    const issues: string[] = [];
    if (teams !== 4) issues.push(`Expected exactly 4 teams, found ${teams}.`);
    if (players === 0) issues.push("No players have been created yet.");
    if (astronauts.length === 0) issues.push("No active astronauts exist yet.");
    if (unassignedPlayers > 0 && activity.status === "ACTIVE") {
      issues.push(`${unassignedPlayers} player(s) are not assigned to a team.`);
    }

    const assignedAstronautIds = new Set(assignments.map((a) => a.astronautId));
    const unassignedAstros = astronauts.filter((a) => !assignedAstronautIds.has(a.id));
    if (unassignedAstros.length > 0) {
      issues.push(`${unassignedAstros.length} active astronaut(s) are not assigned to a team.`);
    }

    const teamIdsWithAssignments = new Set(assignments.map((a) => a.teamId));
    const teamRows = await ctx.prisma.team.findMany({ select: { id: true, name: true } });
    for (const team of teamRows) {
      if (!teamIdsWithAssignments.has(team.id)) {
        issues.push(`Team "${team.name}" has no astronaut assignments.`);
      }
    }

    return {
      activity,
      counts: {
        teams,
        players,
        unassignedPlayers,
        astronauts: astronauts.length,
        assignments: assignments.length,
      },
      issues,
      ready: issues.length === 0,
    };
  }),

  finish: adminProcedure.mutation(async ({ ctx }) => {
    const activity = await getOrCreateActivity();
    if (activity.status === "FINISHED") return activity;
    if (activity.status !== "ACTIVE") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Activity cannot be finished from its current state.",
      });
    }
    return ctx.prisma.activity.update({
      where: { id: activity.id },
      data: { status: "FINISHED", endedAt: new Date() },
    });
  }),
});
