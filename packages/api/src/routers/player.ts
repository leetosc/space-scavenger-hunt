import { auth } from "@space-scavenger-hunt/auth";
import { env } from "@space-scavenger-hunt/env/server";
import { TRPCError } from "@trpc/server";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";

import { adminProcedure, protectedProcedure, publicProcedure, router } from "../index";
import { formatFullName } from "../lib/format-full-name";

export const playerRouter = router({
  signUp: publicProcedure
    .input(
      z.object({
        username: z.string().min(3).max(40),
        password: z.string().min(8).max(200),
        firstName: z.string().min(1).max(40),
        lastName: z.string().min(1).max(40),
        icon: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const username = input.username.trim().toLowerCase();
      const firstName = input.firstName.trim();
      const lastName = input.lastName.trim();
      const fullName = formatFullName(firstName, lastName);

      const existing = await ctx.prisma.user.findUnique({ where: { username } });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Username "${username}" is already taken.`,
        });
      }

      const email = `${username}@${env.USER_EMAIL_DOMAIN}`.toLowerCase();

      await auth.api.signUpEmail({
        body: {
          name: fullName,
          email,
          password: input.password,
          username,
          firstName,
          lastName,
        },
      });

      const user = await ctx.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "User creation failed unexpectedly.",
        });
      }

      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { firstName, lastName, name: fullName },
      });

      const player = await ctx.prisma.player.create({
        data: {
          name: fullName,
          icon: input.icon,
          authUserId: user.id,
          isCheckedIn: false,
        },
      });

      return { playerId: player.id, userId: user.id, username };
    }),

  updateMe: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1).max(40).optional(),
        lastName: z.string().min(1).max(40).optional(),
        icon: z.string().min(1).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (
        input.firstName === undefined &&
        input.lastName === undefined &&
        input.icon === undefined
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No fields to update.",
        });
      }

      if (input.icon !== undefined && !ctx.user.player) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No player profile found for this account.",
        });
      }

      const firstName = input.firstName ?? ctx.user.firstName;
      const lastName = input.lastName ?? ctx.user.lastName;
      const fullName = formatFullName(firstName, lastName);

      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(input.firstName !== undefined && { firstName: input.firstName.trim() }),
          ...(input.lastName !== undefined && { lastName: input.lastName.trim() }),
          ...((input.firstName !== undefined || input.lastName !== undefined) && {
            name: fullName,
          }),
        },
      });

      if (!ctx.user.player) {
        return null;
      }

      return ctx.prisma.player.update({
        where: { id: ctx.user.player.id },
        data: {
          ...(input.icon !== undefined && { icon: input.icon }),
          ...((input.firstName !== undefined || input.lastName !== undefined) && {
            name: fullName,
          }),
        },
      });
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        newPassword: z.string().min(8).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.findFirst({
        where: {
          userId: ctx.user.id,
          providerId: "credential",
        },
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No password account found for this user.",
        });
      }

      const passwordHash = await hashPassword(input.newPassword);
      await ctx.prisma.account.update({
        where: { id: account.id },
        data: { password: passwordHash },
      });

      return { success: true as const };
    }),

  me: protectedProcedure.query(({ ctx }) => {
    return {
      user: {
        id: ctx.user.id,
        name: ctx.user.name,
        firstName: ctx.user.firstName,
        lastName: ctx.user.lastName,
        username: ctx.user.username,
        role: ctx.user.role,
        image: ctx.user.image,
      },
      player: ctx.user.player
        ? {
            id: ctx.user.player.id,
            name: ctx.user.player.name,
            icon: ctx.user.player.icon,
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

  getJoinDisplayState: publicProcedure.query(async ({ ctx }) => {
    const players = await ctx.prisma.player.findMany({
      where: { isCheckedIn: true },
      orderBy: { createdAt: "desc" },
      include: {
        authUser: { select: { username: true } },
      },
    });

    return {
      readyCount: players.length,
      players: players.map((player) => ({
        id: player.id,
        name: player.name,
        icon: player.icon,
        username: player.authUser?.username ?? null,
        createdAt: player.createdAt,
      })),
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
      const nameParts = input.name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? input.name;
      const lastName = nameParts.slice(1).join(" ");

      await auth.api.signUpEmail({
        body: {
          name: input.name,
          email,
          password: input.password,
          username,
          firstName,
          lastName,
        },
      });

      const user = await ctx.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "User creation failed unexpectedly.",
        });
      }

      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { firstName, lastName, name: input.name },
      });

      const player = await ctx.prisma.player.create({
        data: {
          name: input.name,
          authUserId: user.id,
          isCheckedIn: false,
        },
      });

      return { playerId: player.id, userId: user.id, username };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(80).optional(),
        icon: z.string().max(100).optional(),
        teamId: z.string().nullish(),
        isCheckedIn: z.boolean().optional(),
        role: z.enum(["PLAYER", "ADMIN"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, role, ...playerData } = input;

      // Update auth user role if provided
      if (role !== undefined) {
        const player = await ctx.prisma.player.findUnique({ where: { id } });
        if (player?.authUserId) {
          await ctx.prisma.user.update({
            where: { id: player.authUserId },
            data: { role },
          });
        }
      }

      return ctx.prisma.player.update({
        where: { id },
        data: {
          ...(playerData.name !== undefined && { name: playerData.name }),
          ...(playerData.icon !== undefined && { icon: playerData.icon }),
          ...(playerData.teamId !== undefined && { teamId: playerData.teamId ?? null }),
          ...(playerData.isCheckedIn !== undefined && { isCheckedIn: playerData.isCheckedIn }),
        },
        include: {
          team: true,
          authUser: { select: { id: true, username: true, role: true } },
        },
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
