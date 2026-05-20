"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { useEffect, useRef, useState } from "react";

import NameWheel from "@/components/kickoff/name-wheel";
import TeamCards from "@/components/kickoff/team-cards";
import { trpc } from "@/utils/trpc";

const SPIN_MS = 1800;
const REVEAL_MS = 2000;

export default function KickoffDisplayPage() {
  const queryClient = useQueryClient();
  const state = useQuery({
    ...trpc.kickoff.getDisplayState.queryOptions(),
    refetchInterval: 1500,
  });

  const [animating, setAnimating] = useState(false);
  const [reveal, setReveal] = useState<{ id: string; name: string; teamId: string } | null>(null);
  const previousAssignedRef = useRef<Set<string>>(new Set());
  const previousAssignedCountRef = useRef<number>(0);

  useEffect(() => {
    if (!state.data) return;

    const assignedNow = new Set<string>();
    for (const team of state.data.teams) {
      for (const p of team.players) assignedNow.add(p.id);
    }

    if (previousAssignedRef.current.size === 0 && assignedNow.size > 0) {
      // First load - just record state, don't replay reveals.
      previousAssignedRef.current = assignedNow;
      previousAssignedCountRef.current = assignedNow.size;
      return;
    }

    const newlyAssigned: { id: string; name: string; teamId: string }[] = [];
    for (const team of state.data.teams) {
      for (const p of team.players) {
        if (!previousAssignedRef.current.has(p.id)) {
          newlyAssigned.push({ id: p.id, name: p.name, teamId: team.id });
        }
      }
    }

    if (newlyAssigned.length > 0 && !animating) {
      const target = newlyAssigned[0]!;
      setAnimating(true);
      setReveal(null);

      setTimeout(() => {
        setReveal(target);
        // Confetti burst from the assigned team's card area.
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.5 },
        });
        setTimeout(() => {
          setAnimating(false);
          setReveal(null);
          previousAssignedRef.current = assignedNow;
          previousAssignedCountRef.current = assignedNow.size;
          queryClient.invalidateQueries({ queryKey: trpc.kickoff.getDisplayState.queryKey() });
        }, REVEAL_MS);
      }, SPIN_MS);
    } else if (!animating) {
      previousAssignedRef.current = assignedNow;
      previousAssignedCountRef.current = assignedNow.size;
    }
  }, [state.data, animating, queryClient]);

  useEffect(() => {
    if (state.data?.status === "ACTIVE") {
      // Final celebration.
      const duration = 3000;
      const end = Date.now() + duration;
      const tick = () => {
        confetti({ particleCount: 60, spread: 100, origin: { x: 0.1, y: 0.6 } });
        confetti({ particleCount: 60, spread: 100, origin: { x: 0.9, y: 0.6 } });
        if (Date.now() < end) requestAnimationFrame(tick);
      };
      tick();
    }
  }, [state.data?.status]);

  if (!state.data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-muted-foreground">Awaiting Mission Control...</p>
      </div>
    );
  }

  const candidates = state.data.unassignedPlayers;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 to-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col gap-8">
        <header className="text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight">
            Mission Crew Assignment
          </h1>
          <p className="text-muted-foreground mt-2">
            {state.data.assignedCount} / {state.data.totalPlayers} astronauts deployed
          </p>
        </header>

        <section className="min-h-[180px] flex items-center justify-center">
          <NameWheel
            candidates={candidates}
            spinningTarget={animating && !reveal ? { id: "spin", name: "" } : null}
            reveal={reveal}
          />
        </section>

        <section>
          <TeamCards teams={state.data.teams} />
        </section>

        {state.data.status === "ACTIVE" ? (
          <div className="text-center py-8">
            <p className="text-3xl md:text-5xl font-bold">All systems go. Launch successful.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
