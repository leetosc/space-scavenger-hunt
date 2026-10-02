"use client";

import type { AppRouter } from "@space-scavenger-hunt/api/routers/index";
import { Button } from "@space-scavenger-hunt/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import confetti from "canvas-confetti";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { Loader2, Shuffle, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import StarfieldBackground from "@/components/starfield-background";
import { TeamIcon } from "@/components/team-icon";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

type Display = inferRouterOutputs<AppRouter>["kickoff"]["getDisplayState"];
type Player = Display["unassignedPlayers"][number];

function Name({ player, color, reduced }: { player: Player; color?: string | null; reduced: boolean }) {
  return <motion.div layoutId={`crew-${player.id}`} transition={{ layout: { duration: reduced ? 0 : 1.6, ease: [0.22, 1, 0.36, 1] } }} className="relative z-20 rounded-lg border bg-slate-900 px-3 py-2 text-center text-sm font-bold shadow-lg" style={{ borderColor: color ?? "#22d3ee66", color: color ?? "#e2e8f0" }}>
    {player.name}
  </motion.div>;
}

export default function KickoffDisplayPage() {
  const queryClient = useQueryClient();
  const reduced = !!useReducedMotion();
  const state = useQuery({ ...trpc.kickoff.getDisplayState.queryOptions(), refetchInterval: 1500 });
  const { data: session } = authClient.useSession();
  const me = useQuery({ ...trpc.player.me.queryOptions(), enabled: !!session });
  const [display, setDisplay] = useState<Display>();
  const [phase, setPhase] = useState<"idle" | "shuffling" | "flying">("idle");
  const seenBatch = useRef<string | null | undefined>(undefined);
  const revealTarget = useRef<Display | undefined>(undefined);
  const assign = useMutation({ ...trpc.kickoff.assignTeams.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.kickoff.getDisplayState.queryKey() }),
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    const data = state.data;
    if (!data || phase !== "idle") return;
    if (seenBatch.current === undefined || !data.assignmentBatchId || seenBatch.current === data.assignmentBatchId) {
      seenBatch.current = data.assignmentBatchId;
      setDisplay(data);
      return;
    }
    seenBatch.current = data.assignmentBatchId;
    if (reduced) { setDisplay(data); return; }
    // Keep the old positions mounted through the anticipation beat.
    revealTarget.current = data;
    setPhase("shuffling");
  }, [state.data, phase, reduced]);

  useEffect(() => {
    if (phase === "idle") return;
    const timer = setTimeout(() => {
      if (phase === "shuffling") {
        setDisplay(revealTarget.current);
        setPhase("flying");
      } else {
        if (!reduced) confetti({ particleCount: 160, spread: 110, origin: { y: 0.6 }, disableForReducedMotion: true });
        setPhase("idle");
      }
    }, phase === "shuffling" ? 900 : 1700);
    return () => clearTimeout(timer);
  }, [phase, reduced]);

  // An admin reset during a reveal cancels it rather than replaying stale names.
  useEffect(() => {
    if (state.data && state.data.assignmentBatchId === null && seenBatch.current) {
      seenBatch.current = null; setPhase("idle"); setDisplay(state.data);
    }
  }, [state.data]);

  if (state.error) return <p role="alert" className="p-10 text-center">{state.error.message}</p>;
  if (!display) return <p role="status" className="p-10 text-center">Awaiting Mission Control…</p>;
  return <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 text-white">
    <StarfieldBackground />
    <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="text-center"><p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-cyan-300">Luke &amp; Leo · One year around the sun</p><h1 className="text-4xl font-black md:text-6xl">Meet your birthday crew</h1><p aria-live="polite" className="mt-3 text-lg text-slate-400">{phase === "shuffling" ? "Mixing up the crews…" : phase === "flying" ? "Everyone, to your spaceships!" : `${display.assignedCount} / ${display.totalPlayers} astronauts deployed`}</p></header>
      {me.data?.user.role === "ADMIN" ? <Button className="mx-auto" size="lg" disabled={state.data?.status !== "TEAM_ASSIGNMENT" || !state.data.unassignedPlayers.length || phase !== "idle" || assign.isPending} onClick={() => assign.mutate()}>{assign.isPending ? <Loader2 className="animate-spin" /> : <Shuffle />}Assign all teams</Button> : null}
      <LayoutGroup id="birthday-crew">
        <section aria-label="Unassigned crew" className="min-h-32 rounded-2xl border border-cyan-400/15 bg-slate-950/40 p-5">
          <p className="mb-4 text-center text-xs uppercase tracking-widest text-cyan-300">{display.unassignedPlayers.length ? "Ready for launch" : "All crews aboard"}</p>
          <motion.div className="flex flex-wrap justify-center gap-3" animate={phase === "shuffling" ? { x: [0, -7, 7, -4, 4, 0], y: [0, -5, 0] } : { x: 0, y: 0 }} transition={{ duration: 0.45, repeat: phase === "shuffling" ? Infinity : 0 }}>
            {display.unassignedPlayers.map(player => <Name key={player.id} player={player} reduced={reduced} />)}
          </motion.div>
        </section>
        <section aria-label="Mission teams" className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {display.teams.map(team => <div key={team.id} className="min-h-48 rounded-xl border bg-slate-950/75 p-4" style={{ borderColor: team.color ?? "#22d3ee44", boxShadow: phase === "flying" ? `0 0 30px ${team.color ?? "#22d3ee"}33` : undefined }}>
            <div className="mb-4 flex items-center gap-2"><TeamIcon icon={team.icon} color={team.color} name={team.name} /><h2 className="font-bold">{team.name}</h2><span className="ml-auto text-xs text-slate-400">{team.players.length}</span></div>
            <div className="flex flex-col gap-2">{team.players.map(player => <Name key={player.id} player={player} color={team.color} reduced={reduced} />)}</div>
          </div>)}
        </section>
      </LayoutGroup>
      {display.status === "ACTIVE" ? <p className="flex items-center justify-center gap-3 py-6 text-center text-3xl font-bold"><Sparkles className="text-yellow-300" />The birthday mission is a go!</p> : null}
    </div>
  </main>;
}
