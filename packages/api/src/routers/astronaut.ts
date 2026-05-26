import { env } from "@space-scavenger-hunt/env/server";
import { TRPCError } from "@trpc/server";
import { customAlphabet } from "nanoid";
import { z } from "zod";

import type { Context } from "../context";
import { adminProcedure, publicProcedure, router } from "../index";
import { generateAstronautProfile } from "../services/ai/generate-astronaut";
import { getAttemptPhotoPreviewPath } from "../services/attempt-photo-url";

const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const generateFourLetterCode = customAlphabet(CODE_ALPHABET, 4);
const fourLetterCodeSchema = z
  .string()
  .trim()
  .length(4, "Code must be exactly 4 letters.")
  .regex(/^[a-zA-Z]+$/, "Code must contain letters only.")
  .transform((code) => code.toUpperCase());

async function generateUniqueCode(prisma: Context["prisma"]) {
  const maxAttempts = 50;
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateFourLetterCode();
    const existing = await prisma.astronaut.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique astronaut code");
}

export const astronautRouter = router({
  getByCode: publicProcedure
    .input(z.object({ code: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const code =
        input.code.length === 4 ? input.code.toUpperCase() : input.code;
      const astronaut = await ctx.prisma.astronaut.findUnique({
        where: { code },
        select: {
          id: true,
          name: true,
          description: true,
          hint: true,
          code: true,
          active: true,
          claims: {
            orderBy: { claimedAt: "desc" },
            select: {
              team: {
                select: { id: true, name: true, color: true, icon: true },
              },
              claimedAt: true,
              claimAttempt: {
                select: {
                  id: true,
                  taskPrompt: true,
                  imageBlobName: true,
                },
              },
            },
          },
        },
      });
      if (!astronaut) return null;
      const claimedBy = astronaut.claims[0]?.team ?? null;
      const claimedAt = astronaut.claims[0]?.claimedAt ?? null;
      const claimAttempt = astronaut.claims[0]?.claimAttempt ?? null;
      return {
        id: astronaut.id,
        name: astronaut.name,
        description: astronaut.description,
        hint: astronaut.hint,
        code: astronaut.code,
        active: astronaut.active,
        claimedBy,
        claimedAt,
        claimedAttempt: claimAttempt
          ? {
              id: claimAttempt.id,
              taskPrompt: claimAttempt.taskPrompt,
              previewUrl: claimAttempt.imageBlobName
                ? getAttemptPhotoPreviewPath(claimAttempt.id)
                : undefined,
            }
          : null,
      };
    }),

  list: adminProcedure.query(({ ctx }) => {
    return ctx.prisma.astronaut.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        assignments: { include: { team: true } },
        claims: { orderBy: { claimedAt: "desc" }, include: { team: true } },
      },
    });
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().max(80).optional(),
        description: z.string().max(500).optional(),
        hint: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let { name, description } = input;

      // Use AI to generate missing name/description
      if (!name?.trim() || !description?.trim()) {
        const existingProfiles = await ctx.prisma.astronaut.findMany({
          orderBy: { createdAt: "asc" },
          select: { name: true, description: true },
        });
        const generated = await generateAstronautProfile({ existingProfiles });
        if (!name?.trim()) name = generated.name;
        if (!description?.trim()) description = generated.description;
      }

      return ctx.prisma.astronaut.create({
        data: {
          name,
          description,
          hint: input.hint,
          code: await generateUniqueCode(ctx.prisma),
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
        code: fourLetterCodeSchema.optional(),
        active: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      if (rest.code) {
        const existing = await ctx.prisma.astronaut.findUnique({
          where: { code: rest.code },
          select: { id: true },
        });
        if (existing && existing.id !== id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That astronaut code is already in use.",
          });
        }
      }
      return ctx.prisma.astronaut.update({ where: { id }, data: rest });
    }),

  toggleActive: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.prisma.astronaut.findUnique({
        where: { id: input.id },
      });
      if (!current) throw new Error("Not found");
      return ctx.prisma.astronaut.update({
        where: { id: input.id },
        data: { active: !current.active },
      });
    }),

  setClaimedByTeam: adminProcedure
    .input(
      z.object({ id: z.string().min(1), teamId: z.string().min(1).nullable() }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx) => {
        const astronaut = await tx.astronaut.findUnique({
          where: { id: input.id },
          select: { id: true },
        });
        if (!astronaut) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Astronaut not found.",
          });
        }

        const existingClaims = await tx.teamClaim.findMany({
          where: { astronautId: input.id },
          select: {
            claimAttempt: {
              select: {
                id: true,
                imageBlobName: true,
                imageUrl: true,
                submittedAt: true,
              },
            },
          },
        });

        await tx.teamClaim.deleteMany({ where: { astronautId: input.id } });

        for (const claim of existingClaims) {
          await tx.claimAttempt.update({
            where: { id: claim.claimAttempt.id },
            data: {
              status:
                claim.claimAttempt.submittedAt ||
                claim.claimAttempt.imageBlobName ||
                claim.claimAttempt.imageUrl
                  ? "SUBMITTED"
                  : "PENDING_PHOTO",
              reviewedAt: null,
            },
          });
        }

        if (!input.teamId) {
          return { claimed: false };
        }

        const team = await tx.team.findUnique({
          where: { id: input.teamId },
          select: { id: true },
        });
        if (!team) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Team not found.",
          });
        }

        const player = await tx.player.findFirst({
          where: { teamId: input.teamId },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
        if (!player) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Add a player to this team before manually claiming an astronaut.",
          });
        }

        const reviewedAt = new Date();
        const attempt =
          (await tx.claimAttempt.findFirst({
            where: { teamId: input.teamId, astronautId: input.id },
            orderBy: { createdAt: "desc" },
            select: { id: true },
          })) ??
          (await tx.claimAttempt.create({
            data: {
              teamId: input.teamId,
              astronautId: input.id,
              scannedByPlayerId: player.id,
              status: "APPROVED",
              taskPrompt: "Manually claimed by admin.",
              reviewedAt,
            },
            select: { id: true },
          }));

        await tx.claimAttempt.update({
          where: { id: attempt.id },
          data: { status: "APPROVED", reviewedAt },
        });

        const activity = await tx.activity.findFirst({
          orderBy: { createdAt: "asc" },
        });
        const claimedElapsedSeconds = activity?.startedAt
          ? Math.max(
              0,
              Math.floor(
                (reviewedAt.getTime() - activity.startedAt.getTime()) / 1000,
              ),
            )
          : null;

        const claim = await tx.teamClaim.create({
          data: {
            teamId: input.teamId,
            astronautId: input.id,
            claimAttemptId: attempt.id,
            claimedAt: reviewedAt,
            claimedElapsedSeconds,
          },
        });

        return { claimed: true, claimId: claim.id };
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
      const astronaut = await ctx.prisma.astronaut.findUnique({
        where: { id: input.id },
      });
      if (!astronaut) throw new Error("Not found");
      return {
        url: `${env.APP_BASE_URL.replace(/\/$/, "")}/astronaut/${astronaut.code}`,
      };
    }),
});
