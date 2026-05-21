import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, playerProcedure, router } from "../index";
import { getReadSasUrl } from "../services/azure-blob";
import { approveClaim } from "../services/claims/approve-claim";
import { rejectClaim } from "../services/claims/reject-claim";

export const CLAIM_ATTEMPT_STATUSES = [
  "PENDING_PHOTO",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
] as const;

export const attemptRouter = router({
  getById: playerProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const attempt = await ctx.prisma.claimAttempt.findUnique({
        where: { id: input.id },
        include: { astronaut: true, team: true, claim: true },
      });
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND", message: "Attempt not found." });
      if (attempt.teamId !== ctx.player.teamId && ctx.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your team's attempt." });
      }
      let previewUrl: string | undefined;
      if (attempt.imageBlobName) {
        try {
          previewUrl = getReadSasUrl(attempt.imageBlobName);
        } catch {
          previewUrl = undefined;
        }
      }
      return { attempt, previewUrl };
    }),

  getForCurrentPlayer: playerProcedure.query(({ ctx }) => {
    if (!ctx.player.teamId) return [];
    return ctx.prisma.claimAttempt.findMany({
      where: { teamId: ctx.player.teamId, status: { in: ["PENDING_PHOTO", "SUBMITTED"] } },
      include: { astronaut: true },
      orderBy: { createdAt: "desc" },
    });
  }),

  adminList: adminProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const attempts = await ctx.prisma.claimAttempt.findMany({
        where: input?.status ? { status: input.status } : undefined,
        include: { astronaut: true, team: true, scannedByPlayer: true, claim: true },
        orderBy: { createdAt: "desc" },
      });
      return attempts.map((a) => {
        let previewUrl: string | undefined;
        if (a.imageBlobName) {
          try {
            previewUrl = getReadSasUrl(a.imageBlobName);
          } catch {
            previewUrl = undefined;
          }
        }
        return { ...a, previewUrl };
      });
    }),

  adminApprove: adminProcedure
    .input(z.object({ attemptId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return approveClaim(input.attemptId);
    }),

  adminReject: adminProcedure
    .input(z.object({ attemptId: z.string().min(1), feedback: z.string().max(500).optional() }))
    .mutation(async ({ input }) => {
      return rejectClaim(input.attemptId, input.feedback);
    }),

  adminSetStatus: adminProcedure
    .input(
      z.object({
        attemptId: z.string().min(1),
        status: z.enum(CLAIM_ATTEMPT_STATUSES),
        feedback: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.status === "APPROVED") {
        return approveClaim(input.attemptId);
      }
      if (input.status === "REJECTED") {
        return rejectClaim(input.attemptId, input.feedback);
      }

      return ctx.prisma.$transaction(async (tx) => {
        const attempt = await tx.claimAttempt.findUnique({
          where: { id: input.attemptId },
          include: { claim: true },
        });
        if (!attempt) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Attempt not found." });
        }

        if (attempt.claim) {
          await tx.teamClaim.delete({ where: { id: attempt.claim.id } });
        }

        return tx.claimAttempt.update({
          where: { id: attempt.id },
          data: { status: input.status },
        });
      });
    }),
});
