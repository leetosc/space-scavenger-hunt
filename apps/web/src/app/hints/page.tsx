"use client";

import type { AppRouter } from "@space-scavenger-hunt/api/routers/index";
import { Badge } from "@space-scavenger-hunt/ui/components/badge";
import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { cn } from "@space-scavenger-hunt/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  ImageOff,
  Radar,
  Satellite,
  SkipForward,
  Sparkles,
  UsersRound,
  XCircle,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import {
  buttonInteraction,
  fadeInUp,
  staggerContainer,
} from "@/lib/animations";
import { getHintDistortion } from "@/lib/hint-distortion";
import { useGameHaptics } from "@/hooks/use-game-haptics";
import { IMAGE_BLUR_DATA_URL } from "@/lib/image-placeholder";
import { trpc } from "@/utils/trpc";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Hint = RouterOutputs["hint"]["listForTeam"]["hints"][number];
type FunFactChallenge = RouterOutputs["funFact"]["getTeamChallenge"];

const SIGNAL_BOOST_REVEAL_DURATION_S = 3.15;

function revealLabel(level: number, max: number) {
  if (level >= max) return "Fully revealed";
  return `Signal level ${level}/${max}`;
}

function HintCard({
  hint,
  balance,
  maxRevealLevel,
  spendPending,
  isBoosting,
  onSpend,
}: {
  hint: Hint;
  balance: number;
  maxRevealLevel: number;
  spendPending: boolean;
  isBoosting: boolean;
  onSpend: () => void;
}) {
  const distortion = getHintDistortion(hint.revealLevel);
  const fullyRevealed = hint.revealLevel >= maxRevealLevel;
  const canSpend = balance > 0 && !fullyRevealed;
  const displayTitle = hint.title || "Location signal";

  return (
    <motion.article variants={fadeInUp}>
      <Card className="overflow-hidden rounded-none border-cyan-400/20 bg-slate-950/70 p-0 shadow-[0_0_28px_rgba(6,182,212,0.07)]">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
          {hint.previewUrl ? (
            <>
              <Image
                src={hint.previewUrl}
                alt={displayTitle}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-[filter,transform] duration-500"
                style={{
                  filter: `blur(${distortion.blur}px) contrast(${distortion.contrast}) saturate(${distortion.saturate})`,
                  transform: `scale(${distortion.scale})`,
                }}
                placeholder="blur"
                blurDataURL={IMAGE_BLUR_DATA_URL}
                referrerPolicy="no-referrer"
              />
              {!fullyRevealed ? (
                <>
                  <Image
                    src={hint.previewUrl}
                    alt=""
                    fill
                    aria-hidden="true"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover mix-blend-screen"
                    style={{
                      clipPath:
                        "polygon(0 8%,100% 3%,100% 18%,0 23%,0 42%,100% 35%,100% 49%,0 56%,0 78%,100% 72%,100% 86%,0 92%)",
                      filter: `blur(${Math.max(3, distortion.blur / 2)}px) hue-rotate(35deg) contrast(1.35)`,
                      opacity: distortion.sliceOpacity,
                      transform: `translateX(${hint.revealLevel === 0 ? 4 : 2}%) scale(${hint.revealLevel === 0 ? 1.12 : 1.05})`,
                    }}
                    placeholder="blur"
                    blurDataURL={IMAGE_BLUR_DATA_URL}
                    referrerPolicy="no-referrer"
                  />
                  <Image
                    src={hint.previewUrl}
                    alt=""
                    fill
                    aria-hidden="true"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover mix-blend-multiply"
                    style={{
                      clipPath:
                        "polygon(0 0,100% 0,100% 6%,0 12%,0 31%,100% 26%,100% 39%,0 45%,0 64%,100% 58%,100% 70%,0 76%,0 94%,100% 88%,100% 100%,0 100%)",
                      filter: `blur(${Math.max(2, distortion.blur / 3)}px) grayscale(0.7)`,
                      opacity: distortion.sliceOpacity * 0.7,
                      transform: `translateX(${hint.revealLevel === 0 ? -5 : -2}%) scale(${hint.revealLevel === 0 ? 1.1 : 1.04})`,
                    }}
                    placeholder="blur"
                    blurDataURL={IMAGE_BLUR_DATA_URL}
                    referrerPolicy="no-referrer"
                  />
                  <div
                    className="absolute inset-0 bg-[linear-gradient(rgba(125,211,252,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.08)_1px,transparent_1px)] bg-[length:100%_8px,10px_100%] mix-blend-screen"
                    style={{ opacity: distortion.gridOpacity }}
                  />
                  <div
                    className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,rgba(2,6,23,0.3)_38%,rgba(2,6,23,0.74)_100%)]"
                    style={{ opacity: distortion.maskOpacity }}
                  />
                </>
              ) : null}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
              <ImageOff className="size-8" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                No image signal
              </span>
            </div>
          )}
          <div className="absolute left-3 top-3">
            <Badge
              variant="outline"
              className={cn(
                "rounded-sm border-cyan-400/35 bg-slate-950/80 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200 backdrop-blur",
                fullyRevealed && "border-emerald-400/40 text-emerald-200",
              )}
            >
              {revealLabel(hint.revealLevel, maxRevealLevel)}
            </Badge>
          </div>
          <AnimatePresence>
            {isBoosting ? (
              <motion.div
                className="pointer-events-none absolute inset-0 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="absolute inset-x-0 h-16 bg-[linear-gradient(180deg,transparent,rgba(34,211,238,0.08),rgba(34,211,238,0.75),rgba(167,243,208,0.95),rgba(34,211,238,0.75),rgba(34,211,238,0.08),transparent)] shadow-[0_0_38px_rgba(34,211,238,0.75)]"
                  initial={{ y: "-35%" }}
                  animate={{ y: ["-35%", "335%", "-20%"] }}
                  transition={{
                    duration: SIGNAL_BOOST_REVEAL_DURATION_S,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="absolute inset-0 bg-cyan-300/15 mix-blend-screen"
                  animate={{ opacity: [0.1, 0.42, 0.16, 0.35, 0.08] }}
                  transition={{
                    duration: SIGNAL_BOOST_REVEAL_DURATION_S,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="absolute inset-5 border border-cyan-200/40 shadow-[inset_0_0_28px_rgba(34,211,238,0.25),0_0_28px_rgba(34,211,238,0.24)]"
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: [0.96, 1.02, 1], opacity: [0, 1, 0.35] }}
                  transition={{
                    duration: SIGNAL_BOOST_REVEAL_DURATION_S,
                    ease: "easeOut",
                  }}
                />
                <motion.div
                  className="absolute bottom-3 right-3 border border-cyan-300/35 bg-slate-950/80 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100 backdrop-blur"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: [0, 1, 1, 0], y: [8, 0, 0, -6] }}
                  transition={{
                    duration: SIGNAL_BOOST_REVEAL_DURATION_S,
                    ease: "easeOut",
                  }}
                >
                  Signal boost
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <div className="space-y-3 p-4">
          <div className="space-y-1">
            {hint.title ? (
              <h2 className="text-base font-bold text-slate-100">
                {hint.title}
              </h2>
            ) : null}
            {hint.description ? (
              <p className="text-sm leading-6 text-slate-400">
                {hint.description}
              </p>
            ) : null}
          </div>
          <motion.div {...buttonInteraction}>
            <Button
              type="button"
              className="w-full"
              disabled={!canSpend || spendPending}
              onClick={onSpend}
            >
              <Zap data-icon="inline-start" className="size-4" />
              {fullyRevealed ? "Signal locked" : "Boost signal"}
            </Button>
          </motion.div>
        </div>
      </Card>
    </motion.article>
  );
}

function FunFactChallengeCard({
  data,
  guessPending,
  skipPending,
  resumePending,
  onGuess,
  onSkip,
  onResume,
}: {
  data: FunFactChallenge | undefined;
  guessPending: boolean;
  skipPending: boolean;
  resumePending: boolean;
  onGuess: (playerId: string) => void;
  onSkip: () => void;
  onResume: (challengeId: string) => void;
}) {
  const current = data?.current;

  return (
    <motion.section variants={fadeInUp}>
      <Card className="relative overflow-hidden rounded-none border-emerald-400/25 bg-slate-950/70 p-0 shadow-[0_0_34px_rgba(52,211,153,0.1)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(52,211,153,0.06)_1px,transparent_1px)] bg-[length:100%_14px]" />
        <div className="relative border-b border-emerald-400/15 bg-[linear-gradient(90deg,rgba(52,211,153,0.14),rgba(15,23,42,0.7),rgba(34,211,238,0.08))] px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                className="flex size-10 items-center justify-center border border-emerald-400/35 bg-emerald-400/10 text-emerald-200"
                animate={{ rotate: [0, 3, -3, 0] }}
                transition={{ duration: 3.2, repeat: Infinity }}
              >
                <Brain className="size-4" />
              </motion.div>
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                  Signal Boost challenge
                </p>
                <h2 className="text-lg font-bold text-slate-100">
                  Match the fun fact
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 border border-emerald-400/20 bg-slate-950/70 px-2.5 py-1.5 font-mono text-xs text-emerald-100">
              <Sparkles className="size-3.5" />
              +1 Boost on correct
            </div>
          </div>
        </div>

        <div className="relative grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {current ? (
                <motion.div
                  key={current.funFact.id}
                  className="border border-emerald-400/15 bg-slate-900/55 p-4"
                  initial={{ opacity: 0, x: 24, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -24, filter: "blur(4px)" }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300/75">
                    Incoming transmission
                  </p>
                  <blockquote className="mt-2 text-xl font-semibold leading-8 text-slate-100">
                    "{current.funFact.text}"
                  </blockquote>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 font-mono text-cyan-100">
                      {current.attemptsRemaining} attempt
                      {current.attemptsRemaining === 1 ? "" : "s"} left
                    </span>
                    {current.lastGuessedPlayer ? (
                      <span className="border border-amber-400/20 bg-amber-400/10 px-2 py-1 font-mono text-amber-100">
                        Last guess: {current.lastGuessedPlayer.name}
                      </span>
                    ) : null}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  className="flex min-h-40 flex-col items-center justify-center gap-3 border border-emerald-400/15 bg-slate-900/45 p-8 text-center"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                >
                  <CheckCircle2 className="size-8 text-emerald-300" />
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    No available other-team fun facts right now.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {current ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {data.candidates.map((candidate) => (
                  <motion.button
                    key={candidate.id}
                    type="button"
                    className="group flex min-w-0 items-center gap-2 border border-cyan-400/15 bg-slate-900/60 px-3 py-2 text-left transition-colors hover:border-cyan-300/40 hover:bg-cyan-400/10 disabled:opacity-60"
                    disabled={guessPending || skipPending || resumePending}
                    onClick={() => onGuess(candidate.id)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center border border-cyan-400/20 bg-cyan-400/10 text-xs font-bold text-cyan-100">
                      {candidate.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">
                      {candidate.name}
                    </span>
                    <UsersRound className="size-3.5 shrink-0 text-cyan-300/50 transition-colors group-hover:text-cyan-200" />
                  </motion.button>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="space-y-3 border border-emerald-400/10 bg-slate-950/55 p-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!current || skipPending || guessPending}
              onClick={onSkip}
            >
              <SkipForward data-icon="inline-start" className="size-4" />
              {skipPending ? "Skipping..." : "Skip for now"}
            </Button>
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Skipped facts
              </p>
              {!data || data.skipped.length === 0 ? (
                <p className="border border-slate-700/50 bg-slate-900/40 p-3 text-xs text-muted-foreground">
                  Skipped transmissions will appear here.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.skipped.map((skipped) => (
                    <button
                      key={skipped.id}
                      type="button"
                      className="w-full border border-emerald-400/10 bg-slate-900/50 p-2 text-left text-xs text-slate-300 transition-colors hover:border-emerald-300/35 hover:bg-emerald-400/10 disabled:opacity-60"
                      disabled={resumePending || skipPending || guessPending}
                      onClick={() => onResume(skipped.id)}
                    >
                      <span className="line-clamp-2">
                        {skipped.funFact.text}
                      </span>
                      <span className="mt-1 block font-mono text-[10px] text-emerald-300/70">
                        {skipped.attemptsRemaining} attempts left
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </Card>
    </motion.section>
  );
}

export default function HintsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const haptics = useGameHaptics();
  const [boostingHintId, setBoostingHintId] = useState<string | null>(null);
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const hints = useQuery({
    ...trpc.hint.listForTeam.queryOptions(),
    enabled: !!session,
    refetchInterval: 10000,
  });
  const onboarding = useQuery({
    ...trpc.funFact.getOnboardingStatus.queryOptions(),
    enabled: !!session,
  });
  const funFactChallenge = useQuery({
    ...trpc.funFact.getTeamChallenge.queryOptions(),
    enabled: !!session && onboarding.data?.isComplete,
    refetchInterval: 5000,
  });
  const spend = useMutation({
    ...trpc.hint.spendSignalBoost.mutationOptions(),
    onMutate: (input) => {
      setBoostingHintId(input.locationHintId);
    },
    onSuccess: () => {
      haptics.success();
      toast.success("Signal boosted");
      queryClient.invalidateQueries({
        queryKey: trpc.hint.listForTeam.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.team.getDashboard.queryKey(),
      });
    },
    onError: (error) => {
      haptics.error();
      toast.error(error.message);
    },
    onSettled: () => {
      window.setTimeout(
        () => setBoostingHintId(null),
        SIGNAL_BOOST_REVEAL_DURATION_S * 1000 + 200,
      );
    },
  });
  const guess = useMutation({
    ...trpc.funFact.guess.mutationOptions(),
    onSuccess: (result) => {
      if (result.result === "CORRECT") {
        haptics.success();
        toast.success("Correct! Signal Boost added.");
      } else if (result.result === "WRONG") {
        haptics.error();
        toast.error("Not this astronaut. Try another signal.");
      } else if (result.result === "EXHAUSTED") {
        haptics.error();
        toast.error("No attempts left for that fun fact.");
      } else {
        toast.info("No fun facts are available right now.");
      }
      queryClient.invalidateQueries({
        queryKey: trpc.funFact.getTeamChallenge.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.hint.listForTeam.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.team.getDashboard.queryKey(),
      });
    },
    onError: (error) => {
      haptics.error();
      toast.error(error.message);
    },
  });
  const skip = useMutation({
    ...trpc.funFact.skip.mutationOptions(),
    onSuccess: () => {
      toast.info("Fun fact skipped");
      queryClient.invalidateQueries({
        queryKey: trpc.funFact.getTeamChallenge.queryKey(),
      });
    },
    onError: (error) => {
      haptics.error();
      toast.error(error.message);
    },
  });
  const resume = useMutation({
    ...trpc.funFact.resumeSkipped.mutationOptions(),
    onSuccess: () => {
      toast.info("Fun fact restored");
      queryClient.invalidateQueries({
        queryKey: trpc.funFact.getTeamChallenge.queryKey(),
      });
    },
    onError: (error) => {
      haptics.error();
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (!sessionPending && !session) router.push("/login");
  }, [router, session, sessionPending]);

  useEffect(() => {
    if (!onboarding.data) return;
    if (!onboarding.data.isComplete) {
      router.push("/onboarding?next=/hints");
    }
  }, [onboarding.data, router]);

  if (sessionPending || (session && hints.isPending)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-10 text-center">
        <Loader />
        <p className="text-sm text-muted-foreground">
          Loading location signals...
        </p>
      </div>
    );
  }

  if (!session) return null;

  const data = hints.data;

  return (
    <motion.div
      className="relative mx-auto w-full max-w-6xl space-y-6 px-6 py-10"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="sticky top-3 z-30 ml-auto flex w-fit items-center gap-2 border border-emerald-400/30 bg-slate-950/90 px-3 py-2 font-mono text-xs font-bold text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.16)] backdrop-blur-md sm:text-sm"
        variants={fadeInUp}
        animate={{
          scale: spend.isPending ? 1.04 : 1,
          boxShadow: spend.isPending
            ? "0 0 34px rgba(52,211,153,0.28)"
            : "0 0 24px rgba(52,211,153,0.16)",
        }}
      >
        <motion.div
          animate={{ rotate: spend.isPending ? [0, -8, 8, 0] : 0 }}
          transition={{ duration: 0.7, repeat: spend.isPending ? Infinity : 0 }}
        >
          <Zap className="size-4" />
        </motion.div>
        <span className="relative inline-flex min-w-5 justify-center overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={data?.balance ?? 0}
              initial={{ y: -14, opacity: 0, filter: "blur(3px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              exit={{ y: 14, opacity: 0, filter: "blur(3px)" }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
            >
              {data?.balance ?? 0}
            </motion.span>
          </AnimatePresence>
        </span>
        Signal Boost{data?.balance === 1 ? "" : "s"}
      </motion.div>

      <motion.header
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        variants={fadeInUp}
      >
        <div>
          <Link
            href="/dashboard"
            className="mb-3 inline-flex h-8 items-center gap-1.5 border border-cyan-400/20 bg-cyan-400/10 px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100 transition-colors hover:bg-cyan-400/15"
          >
            <ArrowLeft className="size-3.5" />
            Team
          </Link>

          <h1 className="text-2xl font-bold tracking-tight">Hints</h1>
          <p className="text-sm text-muted-foreground">
            Spend Signal Boosts to sharpen location photos.
          </p>
        </div>
      </motion.header>

      <FunFactChallengeCard
        data={funFactChallenge.data}
        guessPending={guess.isPending}
        skipPending={skip.isPending}
        resumePending={resume.isPending}
        onGuess={(playerId) => {
          haptics.select();
          guess.mutate({ playerId });
        }}
        onSkip={() => {
          haptics.select();
          skip.mutate();
        }}
        onResume={(challengeId) => {
          haptics.select();
          resume.mutate({ challengeId });
        }}
      />

      {!data || data.hints.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <Card className="flex flex-col items-center gap-3 rounded-none border-cyan-400/20 bg-slate-950/60 p-10 text-center">
            <Radar className="size-8 text-cyan-300" />
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              No location photos have been transmitted yet.
            </p>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.hints.map((hint) => (
            <HintCard
              key={hint.id}
              hint={hint}
              balance={data.balance}
              maxRevealLevel={data.maxRevealLevel}
              spendPending={spend.isPending}
              isBoosting={boostingHintId === hint.id}
              onSpend={() => {
                haptics.submit();
                spend.mutate({ locationHintId: hint.id });
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
