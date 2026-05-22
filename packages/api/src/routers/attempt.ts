import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, playerProcedure, protectedProcedure, router } from "../index";
import { generateTaskPrompt } from "../services/ai/generate-task";
import { getAttemptPhotoPreviewPath } from "../services/attempt-photo-url";
import { deleteBlob } from "../services/azure-blob";
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
      const canEdit = attempt.teamId === ctx.player.teamId || ctx.user.role === "ADMIN";
      let previewUrl: string | undefined;
      if (attempt.imageBlobName) {
        previewUrl = getAttemptPhotoPreviewPath(attempt.id);
      }
      return { attempt, previewUrl, canEdit };
    }),

  getForCurrentPlayer: playerProcedure.query(({ ctx }) => {
    if (!ctx.player.teamId) return [];
    return ctx.prisma.claimAttempt.findMany({
      where: { teamId: ctx.player.teamId, status: { in: ["PENDING_PHOTO", "SUBMITTED"] } },
      include: { astronaut: true },
      orderBy: { createdAt: "desc" },
    });
  }),

  regenerateTask: playerProcedure
    .input(z.object({ attemptId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const attempt = await ctx.prisma.claimAttempt.findUnique({
        where: { id: input.attemptId },
        include: { claim: true },
      });

      if (!attempt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Attempt not found." });
      }
      if (attempt.teamId !== ctx.player.teamId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your team's attempt." });
      }
      if (attempt.claim) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can't regenerate a task after the astronaut has been claimed.",
        });
      }
      if (attempt.status !== "PENDING_PHOTO" && attempt.status !== "REJECTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can only regenerate tasks before submission or after rejection.",
        });
      }

      const taskPrompt = await generateTaskPrompt();

      return ctx.prisma.claimAttempt.update({
        where: { id: attempt.id },
        data: {
          taskPrompt,
          status: "PENDING_PHOTO",
          imageUrl: null,
          imageBlobName: null,
          imageMimeType: null,
          imageSizeBytes: null,
          aiPassed: null,
          aiConfidence: null,
          aiFeedback: null,
          aiRawResponse: null,
          submittedAt: null,
          reviewedAt: null,
        },
      });
    }),

  listCompleted: protectedProcedure.query(async ({ ctx }) => {
    const attempts = await ctx.prisma.claimAttempt.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      include: { astronaut: true, team: true },
      orderBy: [{ reviewedAt: "desc" }, { submittedAt: "desc" }, { createdAt: "desc" }],
    });

    return attempts.map((a) => {
      let previewUrl: string | undefined;
      if (a.imageBlobName) {
        previewUrl = getAttemptPhotoPreviewPath(a.id);
      }
      return { ...a, previewUrl };
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
          previewUrl = getAttemptPhotoPreviewPath(a.id);
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

  adminDelete: adminProcedure
    .input(z.object({ attemptIds: z.array(z.string().min(1)).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const attempts = await ctx.prisma.claimAttempt.findMany({
        where: { id: { in: input.attemptIds } },
        select: { imageBlobName: true },
      });

      const blobNames = attempts
        .map((a) => a.imageBlobName)
        .filter((name): name is string => name != null);
      await Promise.all(blobNames.map((blobName) => deleteBlob(blobName)));

      const result = await ctx.prisma.claimAttempt.deleteMany({
        where: { id: { in: input.attemptIds } },
      });
      return { deleted: result.count };
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
