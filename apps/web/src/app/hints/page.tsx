"use client";

import type { AppRouter } from "@space-scavenger-hunt/api/routers/index";
import { Badge } from "@space-scavenger-hunt/ui/components/badge";
import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { cn } from "@space-scavenger-hunt/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { motion } from "framer-motion";
import { ImageOff, Radar, Satellite, Zap } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import {
  buttonInteraction,
  fadeInUp,
  staggerContainer,
} from "@/lib/animations";
import { getHintDistortion } from "@/lib/hint-distortion";
import { trpc } from "@/utils/trpc";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Hint = RouterOutputs["hint"]["listForTeam"]["hints"][number];

function revealLabel(level: number, max: number) {
  if (level >= max) return "Fully revealed";
  return `Signal level ${level}/${max}`;
}

function HintCard({
  hint,
  balance,
  maxRevealLevel,
  spendPending,
  onSpend,
}: {
  hint: Hint;
  balance: number;
  maxRevealLevel: number;
  spendPending: boolean;
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

export default function HintsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const hints = useQuery({
    ...trpc.hint.listForTeam.queryOptions(),
    enabled: !!session,
    refetchInterval: 10000,
  });
  const spend = useMutation({
    ...trpc.hint.spendSignalBoost.mutationOptions(),
    onSuccess: () => {
      toast.success("Signal boosted");
      queryClient.invalidateQueries({
        queryKey: trpc.hint.listForTeam.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.team.getDashboard.queryKey(),
      });
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (!sessionPending && !session) router.push("/login");
  }, [router, session, sessionPending]);

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
      className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.header
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        variants={fadeInUp}
      >
        <div>
          <div className="mb-2 inline-flex items-center gap-2 border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">
            <Satellite className="size-3.5" />
            Location signal array
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Hints</h1>
          <p className="text-sm text-muted-foreground">
            Spend Signal Boosts to sharpen shared location photos.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 font-mono text-sm font-bold text-emerald-100">
          <Zap className="size-4" />
          {data?.balance ?? 0} Signal Boost{data?.balance === 1 ? "" : "s"}
        </div>
      </motion.header>

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
              onSpend={() => spend.mutate({ locationHintId: hint.id })}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
