"use client";

import { MAX_FUN_FACT_LENGTH } from "@space-scavenger-hunt/api/constants/fun-fact";
import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { Label } from "@space-scavenger-hunt/ui/components/label";
import { Textarea } from "@space-scavenger-hunt/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, RadioTower, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import {
  buttonInteraction,
  fadeInUp,
  scaleIn,
  staggerContainer,
  springTransition,
} from "@/lib/animations";
import { trpc } from "@/utils/trpc";

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/waiting";
  }
  if (value === "/onboarding") return "/waiting";
  return value;
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const nextPath = getSafeNext(searchParams.get("next"));
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [factOne, setFactOne] = useState("");
  const [factTwo, setFactTwo] = useState("");
  const [completed, setCompleted] = useState(false);

  const status = useQuery({
    ...trpc.funFact.getOnboardingStatus.queryOptions(),
    enabled: !!session,
  });

  useEffect(() => {
    if (!sessionPending && !session) router.push("/login");
  }, [router, session, sessionPending]);

  useEffect(() => {
    if (!status.data) return;
    setFactOne(status.data.facts[0]?.text ?? "");
    setFactTwo(status.data.facts[1]?.text ?? "");
    if (status.data.isComplete && !completed) {
      router.push(nextPath);
    }
  }, [completed, nextPath, router, status.data]);

  const complete = useMutation({
    ...trpc.funFact.completeOnboarding.mutationOptions(),
    onSuccess: async () => {
      setCompleted(true);
      toast.success("Fun facts transmitted");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: trpc.funFact.getOnboardingStatus.queryKey(),
        }),
        queryClient.invalidateQueries({ queryKey: trpc.player.me.queryKey() }),
        queryClient.invalidateQueries({
          queryKey: trpc.player.getJoinDisplayState.queryKey(),
        }),
      ]);
      window.setTimeout(() => router.push(nextPath), 900);
    },
    onError: (error) => toast.error(error.message),
  });

  if (sessionPending || status.isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!session) return null;

  const facts = [factOne.trim(), factTwo.trim()];
  const canSubmit =
    facts.every((fact) => fact.length > 0 && fact.length <= MAX_FUN_FACT_LENGTH) &&
    facts[0]?.toLowerCase() !== facts[1]?.toLowerCase();

  return (
    <motion.div
      className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-3xl items-center px-6 py-10"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="w-full" variants={scaleIn}>
        <Card className="relative overflow-hidden rounded-none border-cyan-400/25 bg-slate-950/70 p-0 shadow-[0_0_42px_rgba(34,211,238,0.12)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.04)_1px,transparent_1px)] bg-[length:100%_16px,16px_100%]" />
          <div className="relative border-b border-cyan-400/15 bg-[linear-gradient(90deg,rgba(34,211,238,0.14),rgba(15,23,42,0.65),rgba(132,204,22,0.08))] px-5 py-4">
            <div className="flex items-center gap-3">
              <motion.div
                className="flex size-10 items-center justify-center border border-cyan-400/35 bg-cyan-400/10 text-cyan-300"
                animate={{
                  boxShadow: [
                    "0 0 0 rgba(34,211,238,0)",
                    "0 0 24px rgba(34,211,238,0.25)",
                    "0 0 0 rgba(34,211,238,0)",
                  ],
                }}
                transition={{ duration: 2.4, repeat: Infinity }}
              >
                <RadioTower className="size-4" />
              </motion.div>
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">
                  Crew calibration
                </p>
                <h1 className="text-2xl font-bold tracking-tight">
                  Fun Facts
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Share two fun facts about yourself that your team probably does
              not already know.
            </p>
          </div>

          <motion.form
            className="relative grid gap-4 p-5"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSubmit) return;
              complete.mutate({ facts });
            }}
          >
            {[factOne, factTwo].map((value, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]"
              >
                <Label
                  htmlFor={`fun-fact-${index}`}
                  className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75"
                >
                  <Sparkles className="size-3.5" />
                  Fun fact {index + 1}
                </Label>
                <Textarea
                  id={`fun-fact-${index}`}
                  value={value}
                  maxLength={MAX_FUN_FACT_LENGTH}
                  rows={3}
                  onChange={(event) =>
                    index === 0
                      ? setFactOne(event.target.value)
                      : setFactTwo(event.target.value)
                  }
                  className="resize-none font-mono"
                />
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {value.trim().length > 0 ? "Signal acquired" : "Awaiting transmission"}
                  </span>
                  <span className="font-mono">{value.length}/{MAX_FUN_FACT_LENGTH}</span>
                </div>
              </motion.div>
            ))}

            <AnimatePresence>
              {facts[0] && facts[1] && facts[0].toLowerCase() === facts[1].toLowerCase() ? (
                <motion.p
                  className="text-sm text-amber-300"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  Give Mission Control two different facts.
                </motion.p>
              ) : null}
            </AnimatePresence>

            <motion.div {...buttonInteraction} variants={fadeInUp}>
              <Button
                type="submit"
                className="w-full"
                disabled={!canSubmit || complete.isPending || completed}
              >
                {completed ? (
                  <CheckCircle2 data-icon="inline-start" className="size-4" />
                ) : (
                  <RadioTower data-icon="inline-start" className="size-4" />
                )}
                {complete.isPending
                  ? "Transmitting..."
                  : completed
                    ? "Transmission complete"
                    : "Complete onboarding"}
              </Button>
            </motion.div>

            <AnimatePresence>
              {completed ? (
                <motion.div
                  className="pointer-events-none absolute inset-0 bg-cyan-300/10"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: [0, 1, 0], scale: 1.04 }}
                  exit={{ opacity: 0 }}
                  transition={springTransition}
                />
              ) : null}
            </AnimatePresence>
          </motion.form>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
