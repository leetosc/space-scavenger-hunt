import { auth } from "@space-scavenger-hunt/auth";
import { env } from "@space-scavenger-hunt/env/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, protectedProcedure, router } from "../index";

export const playerRouter = router({
  me: protectedProcedure.query(({ ctx }) => {
    return {
      user: {
        id: ctx.user.id,
        name: ctx.user.name,
        username: ctx.user.username,
        role: ctx.user.role,
      },
      player: ctx.user.player
        ? {
            id: ctx.user.player.id,
            name: ctx.user.player.name,
            isCheckedIn: ctx.user.player.isCheckedIn,
            teamId: ctx.user.player.teamId,
            team: ctx.user.player.team
              ? {
                  id: ctx.user.player.team.id,
                  name: ctx.user.player.team.name,
                  color: ctx.user.player.team.color,
                }
              : null,
          }
        : null,
    };
  }),

  list: adminProcedure.query(({ ctx }) => {
    return ctx.prisma.player.findMany({
      orderBy: { name: "asc" },
      include: {
        team: true,
        authUser: { select: { id: true, username: true, role: true } },
      },
    });
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80),
        username: z.string().min(3).max(40),
        password: z.string().min(8).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const username = input.username.trim().toLowerCase();
      const existing = await ctx.prisma.user.findUnique({ where: { username } });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A user with username "${username}" already exists.`,
        });
      }

      const email = `${username}@${env.USER_EMAIL_DOMAIN}`.toLowerCase();

      await auth.api.signUpEmail({
        body: {
          name: input.name,
          email,
          password: input.password,
          username,
        },
      });

      const user = await ctx.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "User creation failed unexpectedly.",
        });
      }

      const player = await ctx.prisma.player.create({
        data: {
          name: input.name,
          authUserId: user.id,
          isCheckedIn: true,
        },
      });

      return { playerId: player.id, userId: user.id, username };
    }),

  update: adminProcedure
    .input(z.object({ id: z.string().min(1), name: z.string().min(1).max(80) }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.player.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.prisma.player.findUnique({
        where: { id: input.id },
      });
      if (!player) return { deleted: false };
      await ctx.prisma.player.delete({ where: { id: input.id } });
      if (player.authUserId) {
        await ctx.prisma.user.delete({ where: { id: player.authUserId } }).catch(() => undefined);
      }
      return { deleted: true };
    }),

  resetCheckIn: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.player.update({
        where: { id: input.id },
        data: { isCheckedIn: false },
      });
    }),
});
