import { env } from "@space-scavenger-hunt/env/server";
import { nanoid } from "nanoid";
import { z } from "zod";

import { adminProcedure, router } from "../index";

function generateCode() {
  return `ast_${nanoid(21)}`;
}

export const astronautRouter = router({
  list: adminProcedure.query(({ ctx }) => {
    return ctx.prisma.astronaut.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        assignments: { include: { team: true } },
        claims: { include: { team: true } },
      },
    });
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80),
        description: z.string().max(500).optional(),
        hint: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.astronaut.create({
        data: {
          name: input.name,
          description: input.description,
          hint: input.hint,
          code: generateCode(),
          active: true,
        },
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(80).optional(),
        description: z.string().max(500).optional(),
        hint: z.string().max(500).optional(),
        active: z.boolean().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...rest } = input;
      return ctx.prisma.astronaut.update({ where: { id }, data: rest });
    }),

  toggleActive: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.prisma.astronaut.findUnique({ where: { id: input.id } });
      if (!current) throw new Error("Not found");
      return ctx.prisma.astronaut.update({
        where: { id: input.id },
        data: { active: !current.active },
      });
    }),

  generateCode: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.astronaut.update({
        where: { id: input.id },
        data: { code: generateCode() },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.astronaut.delete({ where: { id: input.id } });
      return { deleted: true };
    }),

  getScanUrl: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const astronaut = await ctx.prisma.astronaut.findUnique({ where: { id: input.id } });
      if (!astronaut) throw new Error("Not found");
      return { url: `${env.APP_BASE_URL.replace(/\/$/, "")}/scan/${astronaut.code}` };
    }),
});
