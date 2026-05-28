import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, publicProcedure, router } from "../index";
import {
  ACTIVITY_STATUSES,
  DEFAULT_MAX_TEAMS,
  buildActivityTiming,
  getOrCreateActivity,
} from "../services/activity";

export const activityRouter = router({
  getCurrent: publicProcedure.query(async () => {
    const activity = await getOrCreateActivity();
    return {
      ...activity,
      ...buildActivityTiming(activity),
    };
  }),

  getState: publicProcedure.query(async () => {
    const activity = await getOrCreateActivity();
    return {
      id: activity.id,
      name: activity.name,
      status: activity.status,
      ...buildActivityTiming(activity),
    };
  }),

  validateSetup: adminProcedure.query(async ({ ctx }) => {
    const [
      activity,
      teams,
      players,
      incompleteOnboardingPlayers,
      astronauts,
      assignments,
      unassignedPlayers,
      activeHints,
      signalBoosts,
    ] = await Promise.all(
      [
        getOrCreateActivity(),
        ctx.prisma.team.count(),
        ctx.prisma.player.count(),
        ctx.prisma.player.count({ where: { isCheckedIn: false } }),
        ctx.prisma.astronaut.findMany({ where: { active: true }, select: { id: true } }),
        ctx.prisma.teamAstronautAssignment.findMany({
          select: { astronautId: true, teamId: true },
        }),
        ctx.prisma.player.count({ where: { teamId: null } }),
        ctx.prisma.locationHint.count({ where: { active: true } }),
        ctx.prisma.team.aggregate({ _sum: { signalBoostBalance: true } }),
      ],
    );

    const issues: string[] = [];
    const maxTeams = activity.maxTeams ?? DEFAULT_MAX_TEAMS;
    if (teams !== maxTeams) issues.push(`Expected exactly ${maxTeams} teams, found ${teams}.`);
    if (players === 0) issues.push("No players have been created yet.");
    if (incompleteOnboardingPlayers > 0) {
      issues.push(`${incompleteOnboardingPlayers} player(s) have not completed onboarding.`);
    }
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
        incompleteOnboardingPlayers,
        unassignedPlayers,
        astronauts: astronauts.length,
        assignments: assignments.length,
        activeHints,
        signalBoosts: signalBoosts._sum.signalBoostBalance ?? 0,
      },
      maxTeams,
      issues,
      ready: issues.length === 0,
    };
  }),

  getSettings: adminProcedure.query(async () => {
    const activity = await getOrCreateActivity();
    return {
      maxTeams: activity.maxTeams ?? DEFAULT_MAX_TEAMS,
      funFactGuessAttempts: activity.funFactGuessAttempts ?? 2,
    };
  }),

  updateSettings: adminProcedure
    .input(
      z.object({
        maxTeams: z.number().int().positive(),
        funFactGuessAttempts: z.number().int().min(1).max(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const activity = await getOrCreateActivity();
      return ctx.prisma.activity.update({
        where: { id: activity.id },
        data: {
          maxTeams: input.maxTeams,
          funFactGuessAttempts: input.funFactGuessAttempts,
        },
      });
    }),

  adminSetState: adminProcedure
    .input(
      z.object({
        status: z.enum(ACTIVITY_STATUSES),
        timeLimitMinutes: z.number().int().positive().max(24 * 60).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const activity = await getOrCreateActivity();
      const now = new Date();

      return ctx.prisma.activity.update({
        where: { id: activity.id },
        data: {
          status: input.status,
          ...(input.status === "ACTIVE" && {
            startedAt: activity.startedAt ?? now,
            ...(input.timeLimitMinutes !== undefined && {
              timeLimitMinutes: input.timeLimitMinutes,
            }),
          }),
          ...(input.status === "FINISHED" && {
            endedAt: activity.endedAt ?? now,
          }),
          ...((input.status === "SETUP" || input.status === "TEAM_ASSIGNMENT") && {
            endedAt: null,
          }),
        },
      });
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
