"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Rocket, Stars } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

function OnboardingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const next = params.get("next");
  const nextPath = next && /^\/(?![\/\\])/.test(next) && !next.startsWith("/onboarding") ? next : "/waiting";
  const { data: session, isPending } = authClient.useSession();
  const status = useQuery({ ...trpc.player.getOnboardingStatus.queryOptions(), enabled: !!session });
  useEffect(() => { if (!isPending && !session) router.replace("/login"); }, [isPending, session, router]);
  useEffect(() => { if (status.data?.isComplete) router.replace(nextPath); }, [status.data?.isComplete, nextPath, router]);
  const complete = useMutation({
    ...trpc.player.completeOnboarding.mutationOptions(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trpc.player.getOnboardingStatus.queryKey() }),
        queryClient.invalidateQueries({ queryKey: trpc.player.me.queryKey() }),
        queryClient.invalidateQueries({ queryKey: trpc.player.getJoinDisplayState.queryKey() }),
      ]);
      router.replace(nextPath);
    },
    onError: error => toast.error(error.message),
  });
  if (isPending || status.isPending) return <Loader />;
  if (!session) return null;
  return (
    <main className="mx-auto flex min-h-[75vh] max-w-2xl items-center px-6 py-10">
      <Card className="w-full space-y-6 border-cyan-400/25 bg-slate-950/70 p-8 shadow-[0_0_42px_rgba(34,211,238,0.12)]">
        <Stars className="size-10 text-cyan-300" />
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-cyan-300">One year around the sun</p>
          <h1 className="text-3xl font-bold">Luke &amp; Leo’s Birthday Mission</h1>
          <p className="mt-3 text-muted-foreground">Celebrate our little astronauts turning one! Join a crew, find hidden astronauts around the house and yard, and complete silly team photo challenges.</p>
        </div>
        <p className="flex gap-3 text-sm leading-6"><Camera className="mt-1 size-5 shrink-0 text-emerald-300" />Take a selfie with Luke and one with Leo to earn two extra Signal Boosts for your team. Use boosts to sharpen location clues.</p>
        {status.error ? <p role="alert" className="text-red-300">{status.error.message}</p> : null}
        <Button className="w-full" disabled={complete.isPending || status.isError} onClick={() => complete.mutate()}>
          <Rocket className="size-4" />{complete.isPending ? "Joining…" : "Join the mission"}
        </Button>
      </Card>
    </main>
  );
}

export default function OnboardingPage() {
  return <Suspense fallback={<Loader />}><OnboardingContent /></Suspense>;
}
