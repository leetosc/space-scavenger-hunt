"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { cn } from "@space-scavenger-hunt/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useRef } from "react";

import { MissionCountdown } from "@/components/mission-countdown";
import { authClient } from "@/lib/auth-client";
import {
  staggerContainer,
  fadeInUp,
  scaleIn,
  popIn,
  shake,
  buttonInteraction,
  bounceTransition,
  springTransition,
} from "@/lib/animations";
import { useGameHaptics } from "@/hooks/use-game-haptics";
import { ICON_MAP } from "@/lib/icons";
import { trpc } from "@/utils/trpc";

export default function AstronautPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const haptics = useGameHaptics();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const astronautQuery = useQuery({
    ...trpc.astronaut.getByCode.queryOptions({ code }),
  });
  const activity = useQuery({
    ...trpc.activity.getState.queryOptions(),
    refetchInterval: 5000,
  });

  const scanMutation = useMutation(trpc.scan.handleScan.mutationOptions());
  const scanCalledRef = useRef(false);

  const astronaut = astronautQuery.data;
  const isLoading = astronautQuery.isPending;

  // ---------- Loading ----------
  if (isLoading || sessionPending) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <motion.p
          className="text-sm text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Loading...
        </motion.p>
      </div>
    );
  }

  // ---------- Not found ----------
  if (!astronaut) {
    return (
      <div className="mx-auto max-w-lg px-6 py-10">
        <motion.div variants={shake} initial="idle" animate="shake">
          <Card className="p-6 text-center space-y-3">
            <h1 className="text-2xl font-bold">Astronaut not found</h1>
            <p className="text-sm text-muted-foreground">
              No astronaut matches the code{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded">
                {code.toUpperCase()}
              </code>
              .
            </p>
            <Link href="/" className="text-sm text-cyan-400 hover:underline">
              Back to home
            </Link>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ---------- Claim action (logged-in players) ----------
  function handleClaim() {
    if (scanCalledRef.current) return;
    haptics.submit();
    scanCalledRef.current = true;
    scanMutation.mutate(
      { code },
      {
        onSuccess: (data) => {
          if (
            data.attemptId &&
            (data.status === "CREATED_ATTEMPT" ||
              data.status === "EXISTING_ATTEMPT")
          ) {
            haptics.success();
            router.push(`/attempt/${data.attemptId}` as Route);
          } else {
            haptics.error();
          }
        },
        onError: () => {
          haptics.error();
        },
        onSettled: () => {
          scanCalledRef.current = false;
        },
      },
    );
  }

  const claimedBy = astronaut.claimedBy;
  const claimedAttempt = astronaut.claimedAttempt;
  const ClaimedTeamIcon = claimedBy?.icon ? ICON_MAP[claimedBy.icon] : null;

  return (
    <motion.div
      className="mx-auto max-w-lg px-6 py-10 space-y-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeInUp}>
        <MissionCountdown
          status={activity.data?.status}
          deadlineAt={activity.data?.deadlineAt}
          serverNow={activity.data?.serverNow}
          className="w-full justify-center"
        />
      </motion.div>

      {/* Astronaut info */}
      <motion.div variants={scaleIn}>
        <Card className="p-6 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <motion.code
                className="bg-muted px-2 py-0.5 rounded text-xs"
                variants={popIn}
                initial="hidden"
                animate="visible"
              >
                {astronaut.code}
              </motion.code>
              <motion.span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-sm border",
                  astronaut.active
                    ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                    : "border-border/40 text-muted-foreground",
                )}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={bounceTransition}
              >
                {astronaut.active ? "Active" : "Inactive"}
              </motion.span>
            </div>
            <motion.h1
              className="text-2xl font-bold"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.15 }}
            >
              {astronaut.name}
            </motion.h1>
          </div>

          {astronaut.description && (
            <motion.p
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              {astronaut.description}
            </motion.p>
          )}

          {astronaut.hint && (
            <motion.div
              className="border border-border/40 rounded p-3 bg-muted/30"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Hint
              </p>
              <p className="text-sm">{astronaut.hint}</p>
            </motion.div>
          )}

          {/* Claim status */}
          {claimedBy && (
            <motion.div
              className="flex items-center gap-2 pt-2 border-t border-border/40"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <span
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-white"
                style={{ backgroundColor: claimedBy.color ?? "#888" }}
              >
                {ClaimedTeamIcon ? (
                  <ClaimedTeamIcon className="size-3.5" />
                ) : (
                  <span className="text-[9px] font-bold">
                    {claimedBy.name.slice(0, 1)}
                  </span>
                )}
              </span>
              <span className="text-sm">
                Claimed by <span className="font-medium">{claimedBy.name}</span>
              </span>
            </motion.div>
          )}

          {claimedAttempt && (
            <motion.div
              className="space-y-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-cyan-300">
                  Completed task
                </p>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {claimedAttempt.taskPrompt}
                </p>
              </div>

              {claimedAttempt.previewUrl && (
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded bg-muted/20">
                  <Image
                    src={claimedAttempt.previewUrl}
                    alt={`Submitted photo for ${astronaut.name}`}
                    fill
                    sizes="(min-width: 640px) 464px, calc(100vw - 72px)"
                    className="object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </motion.div>
          )}
        </Card>
      </motion.div>

      {/* Actions (logged-in only) */}
      {session ? (
        <motion.div variants={fadeInUp}>
          <Card className="p-4 space-y-3">
            <AnimatePresence mode="wait">
              {scanMutation.data ? (
                <motion.div
                  key="result"
                  className="space-y-2"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={bounceTransition}
                >
                  <motion.p
                    className={cn(
                      "text-sm font-medium",
                      scanMutation.data.status === "CREATED_ATTEMPT" ||
                        scanMutation.data.status === "EXISTING_ATTEMPT"
                        ? "text-emerald-400"
                        : "text-amber-400",
                    )}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {scanMutation.data.status === "CREATED_ATTEMPT" ||
                    scanMutation.data.status === "EXISTING_ATTEMPT"
                      ? "Challenge unlocked"
                      : "Cannot claim"}
                  </motion.p>
                  <p className="text-sm text-muted-foreground">
                    {scanMutation.data.message}
                  </p>
                  {scanMutation.data.attemptId && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, ...bounceTransition }}
                    >
                      <Link
                        href={
                          `/attempt/${scanMutation.data.attemptId}` as Route
                        }
                      >
                        <motion.div {...buttonInteraction}>
                          <Button size="sm">Go to challenge</Button>
                        </motion.div>
                      </Link>
                    </motion.div>
                  )}
                </motion.div>
              ) : scanMutation.error ? (
                <motion.div
                  key="error"
                  variants={shake}
                  initial="idle"
                  animate="shake"
                >
                  <p className="text-sm text-red-400">
                    {scanMutation.error.message}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="claim"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    {...buttonInteraction}
                    animate={
                      astronaut.active && !scanMutation.isPending
                        ? {
                            scale: [1, 1.02, 1],
                            transition: {
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            },
                          }
                        : undefined
                    }
                  >
                    <Button
                      onClick={handleClaim}
                      disabled={scanMutation.isPending || !astronaut.active}
                      className="w-full"
                    >
                      {scanMutation.isPending
                        ? "Loading..."
                        : astronaut.active
                          ? "Save this astronaut"
                          : "Astronaut is inactive"}
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={fadeInUp}>
          <Card className="p-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Sign in to claim this astronaut.
            </p>
            <Link href={`/login?next=/astronaut/${code}` as Route}>
              <motion.div {...buttonInteraction}>
                <Button variant="outline">Sign in</Button>
              </motion.div>
            </Link>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
