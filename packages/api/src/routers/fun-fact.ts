import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { MAX_FUN_FACT_LENGTH } from "../constants/fun-fact";
import { adminProcedure, playerProcedure, router } from "../index";
import { getOrCreateActivity } from "../services/activity";

const REQUIRED_FACT_COUNT = 2;
const DEFAULT_ATTEMPTS = 2;

const CHALLENGE_STATUS = {
  ACTIVE: "ACTIVE",
  SKIPPED: "SKIPPED",
  CORRECT: "CORRECT",
  EXHAUSTED: "EXHAUSTED",
} as const;

const challengeStatusSchema = z.enum([
  CHALLENGE_STATUS.ACTIVE,
  CHALLENGE_STATUS.SKIPPED,
  CHALLENGE_STATUS.CORRECT,
  CHALLENGE_STATUS.EXHAUSTED,
]);

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function cleanFact(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

async function getAttemptsLimit() {
  const activity = await getOrCreateActivity();
  return activity.funFactGuessAttempts ?? DEFAULT_ATTEMPTS;
}

async function ensureCurrentChallenge(
  tx: any,
  teamId: string,
  requestedFunFactId?: string,
) {
  const existingChallengeRows = await tx.teamFunFactChallenge.findMany({
    where: { teamId },
    select: { playerFunFactId: true, status: true },
  });
  const terminalFactIds = existingChallengeRows
    .filter((challenge: { status: string }) =>
      [CHALLENGE_STATUS.CORRECT, CHALLENGE_STATUS.EXHAUSTED].includes(
        challenge.status as any,
      ),
    )
    .map((challenge: { playerFunFactId: string }) => challenge.playerFunFactId);
  const blockedAutoFactIds = existingChallengeRows
    .filter((challenge: { status: string }) =>
      [
        CHALLENGE_STATUS.CORRECT,
        CHALLENGE_STATUS.EXHAUSTED,
        CHALLENGE_STATUS.SKIPPED,
      ].includes(challenge.status as any),
    )
    .map((challenge: { playerFunFactId: string }) => challenge.playerFunFactId);

  let selectedFactId = requestedFunFactId;
  if (!selectedFactId) {
    const state = await tx.teamFunFactChallengeState.findUnique({
      where: { teamId },
      select: { currentFunFactId: true },
    });
    selectedFactId = state?.currentFunFactId ?? undefined;
  }

  if (selectedFactId) {
    const currentFact = await tx.playerFunFact.findFirst({
      where: {
        id: selectedFactId,
        player: { teamId: { not: null }, NOT: { teamId } },
      },
      include: {
        player: {
          select: { id: true, name: true, icon: true, teamId: true },
        },
      },
    });
    if (currentFact && !terminalFactIds.includes(currentFact.id)) {
      const challenge = await tx.teamFunFactChallenge.upsert({
        where: {
          teamId_playerFunFactId: {
            teamId,
            playerFunFactId: currentFact.id,
          },
        },
        create: {
          teamId,
          playerFunFactId: currentFact.id,
          status: CHALLENGE_STATUS.ACTIVE,
        },
        update: {
          status: CHALLENGE_STATUS.ACTIVE,
        },
        include: {
          playerFunFact: {
            include: {
              player: {
                select: { id: true, name: true, icon: true, teamId: true },
              },
            },
          },
          lastGuessedPlayer: {
            select: { id: true, name: true, icon: true, teamId: true },
          },
        },
      });

      await tx.teamFunFactChallengeState.upsert({
        where: { teamId },
        create: { teamId, currentFunFactId: currentFact.id },
        update: { currentFunFactId: currentFact.id },
      });
      return challenge;
    }
  }

  const eligibleFacts = await tx.playerFunFact.findMany({
    where: {
      id: { notIn: blockedAutoFactIds },
      player: { teamId: { not: null }, NOT: { teamId } },
    },
    include: {
      player: {
        select: { id: true, name: true, icon: true, teamId: true },
      },
    },
  });
  const nextFact = shuffle<any>(eligibleFacts)[0];

  if (!nextFact) {
    await tx.teamFunFactChallengeState.upsert({
      where: { teamId },
      create: { teamId, currentFunFactId: null },
      update: { currentFunFactId: null },
    });
    return null;
  }

  const challenge = await tx.teamFunFactChallenge.upsert({
    where: {
      teamId_playerFunFactId: {
        teamId,
        playerFunFactId: nextFact.id,
      },
    },
    create: {
      teamId,
      playerFunFactId: nextFact.id,
      status: CHALLENGE_STATUS.ACTIVE,
    },
    update: {
      status: CHALLENGE_STATUS.ACTIVE,
    },
    include: {
      playerFunFact: {
        include: {
          player: {
            select: { id: true, name: true, icon: true, teamId: true },
          },
        },
      },
      lastGuessedPlayer: {
        select: { id: true, name: true, icon: true, teamId: true },
      },
    },
  });

  await tx.teamFunFactChallengeState.upsert({
    where: { teamId },
    create: { teamId, currentFunFactId: nextFact.id },
    update: { currentFunFactId: nextFact.id },
  });

  return challenge;
}

function serializeChallenge(challenge: any, attemptsLimit: number) {
  if (!challenge) return null;
  return {
    id: challenge.id,
    status: challenge.status,
    attemptsUsed: challenge.attemptsUsed,
    attemptsRemaining: Math.max(0, attemptsLimit - challenge.attemptsUsed),
    lastAttemptAt: challenge.lastAttemptAt,
    completedAt: challenge.completedAt,
    lastGuessedPlayer: challenge.lastGuessedPlayer,
    funFact: {
      id: challenge.playerFunFact.id,
      text: challenge.playerFunFact.text,
      factOrder: challenge.playerFunFact.factOrder,
    },
  };
}

export const funFactRouter = router({
  getOnboardingStatus: playerProcedure.query(async ({ ctx }) => {
    const facts = await ctx.prisma.playerFunFact.findMany({
      where: { playerId: ctx.player.id },
      orderBy: { factOrder: "asc" },
    });

    return {
      isComplete: ctx.player.isCheckedIn && facts.length >= REQUIRED_FACT_COUNT,
      requiredFactCount: REQUIRED_FACT_COUNT,
      facts: facts.map((fact) => ({
        id: fact.id,
        factOrder: fact.factOrder,
        text: fact.text,
      })),
    };
  }),

  completeOnboarding: playerProcedure
    .input(
      z.object({
        facts: z
          .array(z.string().transform(cleanFact).pipe(z.string().min(1).max(MAX_FUN_FACT_LENGTH)))
          .length(REQUIRED_FACT_COUNT),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const distinct = new Set(input.facts.map((fact) => fact.toLowerCase()));
      if (distinct.size !== REQUIRED_FACT_COUNT) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please share two different fun facts.",
        });
      }

      await ctx.prisma.$transaction(async (tx) => {
        await Promise.all(
          input.facts.map((text, index) =>
            tx.playerFunFact.upsert({
              where: {
                playerId_factOrder: {
                  playerId: ctx.player.id,
                  factOrder: index + 1,
                },
              },
              create: {
                playerId: ctx.player.id,
                factOrder: index + 1,
                text,
              },
              update: { text },
            }),
          ),
        );
        await tx.player.update({
          where: { id: ctx.player.id },
          data: { isCheckedIn: true },
        });
      });

      return { success: true };
    }),

  getTeamChallenge: playerProcedure.query(async ({ ctx }) => {
    if (!ctx.player.teamId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You are not assigned to a team.",
      });
    }
    const teamId = ctx.player.teamId;
    const attemptsLimit = await getAttemptsLimit();
    const [team, candidates, skipped, currentChallenge] = await ctx.prisma.$transaction(
      async (tx) => {
        const [teamRow, candidateRows, skippedRows] = await Promise.all([
          tx.team.findUnique({
            where: { id: teamId },
            select: { id: true, signalBoostBalance: true },
          }),
          tx.player.findMany({
            where: { teamId: { not: null }, NOT: { teamId } },
            orderBy: { name: "asc" },
            select: { id: true, name: true, icon: true, teamId: true },
          }),
          tx.teamFunFactChallenge.findMany({
            where: { teamId, status: CHALLENGE_STATUS.SKIPPED },
            orderBy: { updatedAt: "desc" },
            include: {
              playerFunFact: {
                select: { id: true, text: true, factOrder: true },
              },
            },
          }),
        ]);
        const challenge = await ensureCurrentChallenge(tx, teamId);
        return [teamRow, candidateRows, skippedRows, challenge] as const;
      },
    );

    if (!team) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });
    }

    return {
      balance: team.signalBoostBalance,
      attemptsLimit,
      current: serializeChallenge(currentChallenge, attemptsLimit),
      candidates,
      skipped: skipped.map((challenge) => ({
        id: challenge.id,
        attemptsUsed: challenge.attemptsUsed,
        attemptsRemaining: Math.max(0, attemptsLimit - challenge.attemptsUsed),
        funFact: challenge.playerFunFact,
      })),
    };
  }),

  guess: playerProcedure
    .input(z.object({ playerId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.player.teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are not assigned to a team.",
        });
      }
      const teamId = ctx.player.teamId;
      const attemptsLimit = await getAttemptsLimit();

      return ctx.prisma.$transaction(async (tx) => {
        const candidate = await tx.player.findFirst({
          where: {
            id: input.playerId,
            teamId: { not: null },
            NOT: { teamId },
          },
          select: { id: true },
        });
        if (!candidate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Choose a player from another team.",
          });
        }

        const challenge = await ensureCurrentChallenge(tx, teamId);
        if (!challenge) {
          return {
            result: "NO_FACTS" as const,
            balance: null,
            current: null,
          };
        }

        const correct = challenge.playerFunFact.playerId === input.playerId;
        const now = new Date();
        if (correct) {
          await tx.teamFunFactChallenge.update({
            where: { id: challenge.id },
            data: {
              status: CHALLENGE_STATUS.CORRECT,
              lastGuessedPlayerId: input.playerId,
              lastAttemptAt: now,
              completedAt: now,
            },
          });
          const team = await tx.team.update({
            where: { id: teamId },
            data: { signalBoostBalance: { increment: 1 } },
            select: { signalBoostBalance: true },
          });
          await tx.signalBoostLedger.create({
            data: {
              teamId,
              type: "FUN_FACT_REWARD",
              delta: 1,
              balanceAfter: team.signalBoostBalance,
              note: "Correct fun fact guess",
            },
          });
          const next = await ensureCurrentChallenge(tx, teamId);
          return {
            result: "CORRECT" as const,
            balance: team.signalBoostBalance,
            current: serializeChallenge(next, attemptsLimit),
          };
        }

        const nextAttemptsUsed = challenge.attemptsUsed + 1;
        const exhausted = nextAttemptsUsed >= attemptsLimit;
        await tx.teamFunFactChallenge.update({
          where: { id: challenge.id },
          data: {
            attemptsUsed: nextAttemptsUsed,
            lastGuessedPlayerId: input.playerId,
            lastAttemptAt: now,
            ...(exhausted && {
              status: CHALLENGE_STATUS.EXHAUSTED,
              completedAt: now,
            }),
          },
        });

        const next = exhausted
          ? await ensureCurrentChallenge(tx, teamId)
          : await ensureCurrentChallenge(tx, teamId, challenge.playerFunFactId);
        return {
          result: exhausted ? ("EXHAUSTED" as const) : ("WRONG" as const),
          balance: null,
          current: serializeChallenge(next, attemptsLimit),
        };
      });
    }),

  skip: playerProcedure.mutation(async ({ ctx }) => {
    if (!ctx.player.teamId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You are not assigned to a team.",
      });
    }
    const teamId = ctx.player.teamId;
    const attemptsLimit = await getAttemptsLimit();

    return ctx.prisma.$transaction(async (tx) => {
      const challenge = await ensureCurrentChallenge(tx, teamId);
      if (challenge) {
        await tx.teamFunFactChallenge.update({
          where: { id: challenge.id },
          data: { status: CHALLENGE_STATUS.SKIPPED },
        });
        await tx.teamFunFactChallengeState.upsert({
          where: { teamId },
          create: { teamId, currentFunFactId: null },
          update: { currentFunFactId: null },
        });
      }
      const next = await ensureCurrentChallenge(tx, teamId);
      return { current: serializeChallenge(next, attemptsLimit) };
    });
  }),

  resumeSkipped: playerProcedure
    .input(z.object({ challengeId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.player.teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are not assigned to a team.",
        });
      }
      const teamId = ctx.player.teamId;
      const attemptsLimit = await getAttemptsLimit();

      return ctx.prisma.$transaction(async (tx) => {
        const skipped = await tx.teamFunFactChallenge.findFirst({
          where: {
            id: input.challengeId,
            teamId,
            status: CHALLENGE_STATUS.SKIPPED,
          },
          select: { playerFunFactId: true },
        });
        if (!skipped) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Skipped fun fact not found.",
          });
        }
        const challenge = await ensureCurrentChallenge(
          tx,
          teamId,
          skipped.playerFunFactId,
        );
        return { current: serializeChallenge(challenge, attemptsLimit) };
      });
    }),

  adminList: adminProcedure.query(async ({ ctx }) => {
    const [players, teams, challenges] = await Promise.all([
      ctx.prisma.player.findMany({
        orderBy: { name: "asc" },
        include: {
          team: { select: { id: true, name: true, color: true, icon: true } },
          authUser: { select: { username: true, role: true } },
          funFacts: { orderBy: { factOrder: "asc" } },
        },
      }),
      ctx.prisma.team.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, color: true, icon: true },
      }),
      ctx.prisma.teamFunFactChallenge.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          team: { select: { id: true, name: true, color: true, icon: true } },
          playerFunFact: {
            include: {
              player: {
                select: {
                  id: true,
                  name: true,
                  icon: true,
                  team: { select: { id: true, name: true, color: true, icon: true } },
                },
              },
            },
          },
          lastGuessedPlayer: {
            select: { id: true, name: true, icon: true },
          },
        },
      }),
    ]);

    return { players, teams, challenges };
  }),

  adminUpdatePlayerFacts: adminProcedure
    .input(
      z.object({
        playerId: z.string().min(1),
        facts: z
          .array(z.string().transform(cleanFact).pipe(z.string().min(1).max(MAX_FUN_FACT_LENGTH)))
          .length(REQUIRED_FACT_COUNT),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(async (tx) => {
        await Promise.all(
          input.facts.map((text, index) =>
            tx.playerFunFact.upsert({
              where: {
                playerId_factOrder: {
                  playerId: input.playerId,
                  factOrder: index + 1,
                },
              },
              create: {
                playerId: input.playerId,
                factOrder: index + 1,
                text,
              },
              update: { text },
            }),
          ),
        );
      });
      return { success: true };
    }),

  adminClearPlayerFacts: adminProcedure
    .input(z.object({ playerId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.playerFunFact.deleteMany({
        where: { playerId: input.playerId },
      });
      await ctx.prisma.player.update({
        where: { id: input.playerId },
        data: { isCheckedIn: false },
      });
      return { success: true };
    }),

  adminSetPlayerReady: adminProcedure
    .input(z.object({ playerId: z.string().min(1), isCheckedIn: z.boolean() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.player.update({
        where: { id: input.playerId },
        data: { isCheckedIn: input.isCheckedIn },
      });
    }),

  adminResetChallenge: adminProcedure
    .input(z.object({ challengeId: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.teamFunFactChallenge.delete({
        where: { id: input.challengeId },
      });
    }),

  adminResetTeam: adminProcedure
    .input(z.object({ teamId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction([
        ctx.prisma.teamFunFactChallenge.deleteMany({
          where: { teamId: input.teamId },
        }),
        ctx.prisma.teamFunFactChallengeState.deleteMany({
          where: { teamId: input.teamId },
        }),
      ]);
      return { success: true };
    }),

  adminResetFact: adminProcedure
    .input(z.object({ playerFunFactId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.teamFunFactChallenge.deleteMany({
        where: { playerFunFactId: input.playerFunFactId },
      });
      await ctx.prisma.teamFunFactChallengeState.updateMany({
        where: { currentFunFactId: input.playerFunFactId },
        data: { currentFunFactId: null },
      });
      return { success: true };
    }),

  adminSetChallengeStatus: adminProcedure
    .input(
      z.object({
        challengeId: z.string().min(1),
        status: challengeStatusSchema,
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.teamFunFactChallenge.update({
        where: { id: input.challengeId },
        data: {
          status: input.status,
          completedAt: (
            [CHALLENGE_STATUS.CORRECT, CHALLENGE_STATUS.EXHAUSTED] as string[]
          ).includes(input.status)
            ? new Date()
            : null,
        },
      });
    }),

  adminClearChallenges: adminProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.$transaction([
      ctx.prisma.teamFunFactChallenge.deleteMany(),
      ctx.prisma.teamFunFactChallengeState.deleteMany(),
    ]);
    return { success: true };
  }),
});
