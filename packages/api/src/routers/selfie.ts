import { z } from "zod";

import { adminProcedure, playerProcedure, router } from "../index";
import { approveSelfie, rejectSelfie } from "../services/selfies";

export const selfieRouter = router({
  mine: playerProcedure.query(({ ctx }) => {
    return ctx.prisma.birthdaySelfie.findMany({
      where: { playerId: ctx.player.id },
      orderBy: { createdAt: "desc" },
      include: { credit: { select: { state: true } } },
    });
  }),

  adminList: adminProcedure.query(({ ctx }) => {
    return ctx.prisma.birthdaySelfie.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        player: { select: { name: true } },
        team: { select: { name: true } },
        credit: { include: { locationHint: { select: { id: true, title: true } } } },
        reviews: { orderBy: { createdAt: "asc" } },
      },
    });
  }),

  approve: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.$transaction((tx) => approveSelfie(tx, input.id, ctx.user.id));
    }),

  reject: adminProcedure
    .input(z.object({ id: z.string().min(1), reason: z.string().trim().min(1).max(300) }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.$transaction((tx) => rejectSelfie(tx, input.id, ctx.user.id, input.reason));
    }),
});
