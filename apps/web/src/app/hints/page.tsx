"use client";

import type { AppRouter } from "@space-scavenger-hunt/api/routers/index";
import { Badge } from "@space-scavenger-hunt/ui/components/badge";
import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ImageOff, Radar, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import BirthdaySelfies from "@/components/birthday-selfies";
import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { getHintDistortion } from "@/lib/hint-distortion";
import { useGameHaptics } from "@/hooks/use-game-haptics";
import { IMAGE_BLUR_DATA_URL } from "@/lib/image-placeholder";
import { trpc } from "@/utils/trpc";

type Hint = inferRouterOutputs<AppRouter>["hint"]["listForTeam"]["hints"][number];
function HintCard({ hint, balance, max, pending, boosting, onSpend }: { hint: Hint; balance: number; max: number; pending: boolean; boosting: boolean; onSpend: () => void }) {
  const distortion = getHintDistortion(hint.revealLevel);
  const fullyRevealed = hint.revealLevel >= max;
  return <motion.article variants={fadeInUp}>
    <Card className="overflow-hidden rounded-none border-cyan-400/20 bg-slate-950/70 p-0 shadow-[0_0_28px_rgba(6,182,212,0.07)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
        {hint.previewUrl ? <>
          <Image src={hint.previewUrl} alt={hint.title || "Location signal"} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-[filter,transform] duration-500" style={{ filter: `blur(${distortion.blur}px) contrast(${distortion.contrast}) saturate(${distortion.saturate})`, transform: `scale(${distortion.scale})` }} placeholder="blur" blurDataURL={IMAGE_BLUR_DATA_URL} />
          {!fullyRevealed ? <>
            <Image src={hint.previewUrl} alt="" fill aria-hidden sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover mix-blend-screen" style={{ clipPath: "polygon(0 8%,100% 3%,100% 18%,0 23%,0 42%,100% 35%,100% 49%,0 56%,0 78%,100% 72%,100% 86%,0 92%)", filter: `blur(${Math.max(3, distortion.blur / 2)}px) hue-rotate(35deg) contrast(1.35)`, opacity: distortion.sliceOpacity, transform: "translateX(3%) scale(1.12)" }} />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(125,211,252,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.08)_1px,transparent_1px)] bg-[length:100%_8px,10px_100%] mix-blend-screen" style={{ opacity: distortion.gridOpacity }} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,rgba(2,6,23,0.3)_38%,rgba(2,6,23,0.74)_100%)]" style={{ opacity: distortion.maskOpacity }} />
          </> : null}
        </> : <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500"><ImageOff className="size-8" /><span>No image signal</span></div>}
        <Badge variant="outline" className="absolute left-3 top-3 border-cyan-400/35 bg-slate-950/80 px-2 py-1 text-cyan-200">{fullyRevealed ? "Fully revealed" : `Signal level ${hint.revealLevel}/${max}`}</Badge>
        <AnimatePresence>{boosting ? <motion.div className="pointer-events-none absolute inset-0 bg-cyan-300/15" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.6, 0.2] }} exit={{ opacity: 0 }}><motion.div className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent" initial={{ y: "-100%" }} animate={{ y: ["-100%", "400%", "-100%"] }} transition={{ duration: 3.15 }} /></motion.div> : null}</AnimatePresence>
      </div>
      <div className="space-y-3 p-4">
        {hint.title ? <h2 className="font-bold text-slate-100">{hint.title}</h2> : null}
        {hint.description ? <p className="text-sm leading-6 text-slate-400">{hint.description}</p> : null}
        <Button className="w-full" disabled={balance < 1 || fullyRevealed || pending} onClick={onSpend}><Zap className="size-4" />{fullyRevealed ? "Signal locked" : "Boost signal"}</Button>
      </div>
    </Card>
  </motion.article>;
}

export default function HintsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const haptics = useGameHaptics();
  const [boostingHintId, setBoostingHintId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const onboarding = useQuery({ ...trpc.player.getOnboardingStatus.queryOptions(), enabled: !!session });
  const hints = useQuery({ ...trpc.hint.listForTeam.queryOptions(), enabled: !!session && !!onboarding.data?.isComplete, refetchInterval: 5000 });
  const spend = useMutation({
    ...trpc.hint.spendSignalBoost.mutationOptions(),
    onMutate: input => { if (timer.current) clearTimeout(timer.current); setBoostingHintId(input.locationHintId); },
    onSuccess: () => { haptics.success(); toast.success("Signal boosted"); },
    onError: error => { haptics.error(); toast.error(error.message); },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: trpc.hint.listForTeam.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.team.getDashboard.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.selfie.mine.queryKey() });
      timer.current = setTimeout(() => setBoostingHintId(null), 3350);
    },
  });
  useEffect(() => { if (!sessionPending && !session) router.replace("/login"); }, [router, session, sessionPending]);
  useEffect(() => { if (onboarding.data && !onboarding.data.isComplete) router.replace("/onboarding?next=/hints"); }, [onboarding.data, router]);
  if (sessionPending || onboarding.isPending || (onboarding.data?.isComplete && hints.isPending)) return <Loader />;
  if (!session) return null;
  const data = hints.data;
  return <motion.main className="relative mx-auto w-full max-w-6xl space-y-6 px-6 py-10" variants={staggerContainer} initial="hidden" animate="visible">
    <div className="sticky top-3 z-30 ml-auto flex w-fit items-center gap-2 border border-emerald-400/30 bg-slate-950/90 px-3 py-2 font-mono text-sm text-emerald-100 backdrop-blur"><Zap className="size-4" />{data?.balance ?? 0} Signal Boost{data?.balance === 1 ? "" : "s"}</div>
    <header><Link href="/dashboard" className="mb-3 inline-flex items-center gap-2 text-sm text-cyan-200"><ArrowLeft className="size-4" />Team</Link><h1 className="text-2xl font-bold">Hints</h1><p className="text-sm text-muted-foreground">Spend Signal Boosts to sharpen location photos.</p></header>
    {onboarding.error || hints.error ? <p role="alert" className="text-red-300">{onboarding.error?.message || hints.error?.message}</p> : <BirthdaySelfies />}
    {data?.hints.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.hints.map(hint => <HintCard key={hint.id} hint={hint} balance={data.balance} max={data.maxRevealLevel} pending={spend.isPending} boosting={boostingHintId === hint.id} onSpend={() => { haptics.submit(); spend.mutate({ locationHintId: hint.id }); }} />)}</div> : <Card className="items-center border-cyan-400/20 bg-slate-950/60 p-10 text-center"><Radar className="size-8 text-cyan-300" /><p className="text-muted-foreground">No location photos have been transmitted yet.</p></Card>}
  </motion.main>;
}
