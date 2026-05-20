import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, router } from "../index";

export const assignmentRouter = router({
  list: adminProcedure.query(({ ctx }) => {
    return ctx.prisma.teamAstronautAssignment.findMany({
      include: { team: true, astronaut: true },
      orderBy: { createdAt: "asc" },
    });
  }),

  assign: adminProcedure
    .input(z.object({ teamId: z.string().min(1), astronautId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Enforce single-team-per-astronaut rule.
      const existing = await ctx.prisma.teamAstronautAssignment.findMany({
        where: { astronautId: input.astronautId },
      });
      if (existing.some((a) => a.teamId !== input.teamId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This astronaut is already assigned to a different team. Unassign it first.",
        });
      }
      const team = await ctx.prisma.team.findUnique({ where: { id: input.teamId } });
      const astronaut = await ctx.prisma.astronaut.findUnique({ where: { id: input.astronautId } });
      if (!team || !astronaut) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team or astronaut not found." });
      }
      return ctx.prisma.teamAstronautAssignment.upsert({
        where: {
          teamId_astronautId: { teamId: input.teamId, astronautId: input.astronautId },
        },
        update: {},
        create: { teamId: input.teamId, astronautId: input.astronautId },
      });
    }),

  unassign: adminProcedure
    .input(z.object({ teamId: z.string().min(1), astronautId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.teamAstronautAssignment.deleteMany({
        where: { teamId: input.teamId, astronautId: input.astronautId },
      });
      return { ok: true };
    }),
});
