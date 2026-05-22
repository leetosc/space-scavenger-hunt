"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import NameWheel, { type WheelPhase } from "@/components/kickoff/name-wheel";
import StarfieldBackground from "@/components/starfield-background";
import TeamCards from "@/components/kickoff/team-cards";
import { trpc } from "@/utils/trpc";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Player = { id: string; name: string };
type TeamData = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  players: Player[];
};

type AnimTarget = {
  player: Player;
  teamId: string;
  teamColor: string | null;
};

type FlyState = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  name: string;
  color: string | null;
};

type PagePhase = WheelPhase | "landed";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function KickoffDisplayPage() {
  const queryClient = useQueryClient();
  const state = useQuery({
    ...trpc.kickoff.getDisplayState.queryOptions(),
    refetchInterval: 1500,
  });

  const [phase, setPhase] = useState<PagePhase>("idle");
  const [target, setTarget] = useState<AnimTarget | null>(null);
  const [fly, setFly] = useState<FlyState | null>(null);
  const [highlightTeam, setHighlightTeam] = useState<string | null>(null);
  const [frozenCands, setFrozenCands] = useState<Player[] | null>(null);
  const [frozenTeams, setFrozenTeams] = useState<TeamData[] | null>(null);

  const prevAssigned = useRef<Set<string>>(new Set());
  const hasInitialized = useRef(false);
  const wheelContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  // Keep target accessible in timeout callbacks without stale closures
  const targetRef = useRef<AnimTarget | null>(null);
  targetRef.current = target;

  const registerCard = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      if (el) cardRefs.current.set(id, el);
      else cardRefs.current.delete(id);
    },
    [],
  );

  /* ────────────────────────────────────────────────────────────────── */
  /*  1. Detect new assignment from polling                            */
  /* ────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!state.data || phase !== "idle") return;

    const now = new Set<string>();
    for (const t of state.data.teams)
      for (const p of t.players) now.add(p.id);

    // First load – just record current state, don't replay old assignments
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      prevAssigned.current = now;
      return;
    }

    const fresh: AnimTarget[] = [];
    for (const t of state.data.teams)
      for (const p of t.players)
        if (!prevAssigned.current.has(p.id))
          fresh.push({ player: p, teamId: t.id, teamColor: t.color });

    if (fresh.length > 0) {
      const tgt = fresh[0]!;
      setTarget(tgt);

      // Freeze data: keep target on wheel, hide from team card
      setFrozenCands([...state.data.unassignedPlayers, tgt.player]);
      setFrozenTeams(
        state.data.teams.map((t) => ({
          ...t,
          players: t.players.filter((p) => p.id !== tgt.player.id),
        })),
      );
      setPhase("spinning");
    } else {
      prevAssigned.current = now;
    }
  }, [state.data, phase]);

  /* ────────────────────────────────────────────────────────────────── */
  /*  2. Wheel spin complete → "selected"                              */
  /* ────────────────────────────────────────────────────────────────── */

  const onSpinDone = useCallback(() => setPhase("selected"), []);

  /* ────────────────────────────────────────────────────────────────── */
  /*  3. Selected → flying (after dramatic pause)                      */
  /* ────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (phase !== "selected") return;

    const timer = setTimeout(() => {
      const tgt = targetRef.current;
      if (!tgt) return;

      // Measure positions
      const wr = wheelContainerRef.current?.getBoundingClientRect();
      const x0 = wr ? wr.left + wr.width / 2 : window.innerWidth / 2;
      const y0 = wr ? wr.top + wr.height / 2 : 300;

      const card = cardRefs.current.get(tgt.teamId);
      const cr = card?.getBoundingClientRect();
      const x1 = cr ? cr.left + cr.width / 2 : window.innerWidth / 2;
      const y1 = cr ? cr.top + 30 : window.innerHeight - 150;

      setFly({
        x0,
        y0,
        x1,
        y1,
        name: tgt.player.name,
        color: tgt.teamColor,
      });
      setPhase("flying");
    }, 600);

    return () => clearTimeout(timer);
  }, [phase]);

  /* ────────────────────────────────────────────────────────────────── */
  /*  4. Flying → landed (name arrives at team card)                   */
  /* ────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (phase !== "flying") return;

    const timer = setTimeout(() => {
      // Remove overlay
      setFly(null);

      // Unfreeze data so the player appears in the team card list
      setFrozenCands(null);
      setFrozenTeams(null);

      const tgt = targetRef.current;
      if (tgt) {
        // Impact highlight
        setHighlightTeam(tgt.teamId);

        // Confetti burst at the team card
        const card = cardRefs.current.get(tgt.teamId);
        if (card) {
          const cr = card.getBoundingClientRect();
          confetti({
            particleCount: 140,
            spread: 55,
            origin: {
              x: (cr.left + cr.width / 2) / window.innerWidth,
              y: (cr.top + cr.height / 2) / window.innerHeight,
            },
            colors: tgt.teamColor
              ? [tgt.teamColor, "#facc15", "#ffffff"]
              : undefined,
          });
        } else {
          confetti({
            particleCount: 140,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      }

      setPhase("landed");
    }, 900);

    return () => clearTimeout(timer);
  }, [phase]);

  /* ────────────────────────────────────────────────────────────────── */
  /*  5. Landed → idle (reset for next spin)                           */
  /* ────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (phase !== "landed") return;

    const timer = setTimeout(() => {
      setPhase("idle");
      setTarget(null);
      setHighlightTeam(null);

      // Update tracked set so we don't re-trigger
      if (state.data) {
        const now = new Set<string>();
        for (const tm of state.data.teams)
          for (const p of tm.players) now.add(p.id);
        prevAssigned.current = now;
      }

      queryClient.invalidateQueries({
        queryKey: trpc.kickoff.getDisplayState.queryKey(),
      });
    }, 700);

    return () => clearTimeout(timer);
  }, [phase, state.data, queryClient]);

  /* ────────────────────────────────────────────────────────────────── */
  /*  Final celebration when activity goes ACTIVE                      */
  /* ────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (state.data?.status === "ACTIVE") {
      const end = Date.now() + 3000;
      const tick = () => {
        confetti({
          particleCount: 60,
          spread: 100,
          origin: { x: 0.1, y: 0.6 },
        });
        confetti({
          particleCount: 60,
          spread: 100,
          origin: { x: 0.9, y: 0.6 },
        });
        if (Date.now() < end) requestAnimationFrame(tick);
      };
      tick();
    }
  }, [state.data?.status]);

  /* ────────────────────────────────────────────────────────────────── */
  /*  Render                                                           */
  /* ────────────────────────────────────────────────────────────────── */

  if (!state.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 relative">
        <StarfieldBackground />
        <p className="text-2xl text-muted-foreground relative z-10">
          Awaiting Mission Control...
        </p>
      </div>
    );
  }

  const cands = frozenCands ?? state.data.unassignedPlayers;
  const teams = frozenTeams ?? state.data.teams;
  const wheelPhase: WheelPhase =
    phase === "landed" ? "idle" : phase;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 to-slate-950 text-white overflow-hidden relative">
      <StarfieldBackground />

      {/* Screen shake during spin */}
      <motion.div
        className="relative z-10 mx-auto max-w-7xl px-6 py-8 flex flex-col gap-6"
        animate={
          phase === "spinning"
            ? {
                x: [0, -3, 3, -2, 2, 0],
                y: [0, 2, -2, 1, -1, 0],
              }
            : {}
        }
        transition={
          phase === "spinning"
            ? { duration: 0.15, repeat: Infinity }
            : {}
        }
      >
        {/* Header */}
        <header className="text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight">
            Mission Crew Assignment
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            {state.data.assignedCount} / {state.data.totalPlayers} astronauts
            deployed
          </p>
        </header>

        {/* Wheel */}
        <section
          ref={wheelContainerRef}
          className="flex items-center justify-center py-2"
        >
          <NameWheel
            candidates={cands}
            phase={wheelPhase}
            target={target?.player ?? null}
            onSpinComplete={onSpinDone}
          />
        </section>

        {/* Team cards */}
        <section>
          <TeamCards
            teams={teams}
            registerRef={registerCard}
            highlightTeamId={highlightTeam}
          />
        </section>

        {/* Post-launch message */}
        {state.data.status === "ACTIVE" && (
          <div className="text-center py-8">
            <motion.p
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-3xl md:text-5xl font-bold"
            >
              All systems go. Launch successful.
            </motion.p>
          </div>
        )}
      </motion.div>

      {/* ── Flying name overlay ── */}
      <AnimatePresence>
        {fly && (
          <motion.div
            key="flyname"
            className="fixed inset-0 z-50 pointer-events-none"
          >
            {/* Trailing spark particles */}
            {Array.from({ length: 6 }, (_, i) => {
              const ox = (i % 2 === 0 ? 1 : -1) * (20 + i * 8);
              const oy = 10 + i * 8;
              return (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    left: 0,
                    top: 0,
                    background: fly.color ?? "#facc15",
                    filter: `blur(${i * 2}px)`,
                  }}
                  initial={{ x: fly.x0, y: fly.y0, opacity: 0 }}
                  animate={{
                    x: [
                      fly.x0,
                      (fly.x0 + fly.x1) / 2 + ox,
                      fly.x1,
                    ],
                    y: [
                      fly.y0,
                      Math.min(fly.y0, fly.y1) - 60 - oy,
                      fly.y1,
                    ],
                    opacity: [0, 0.7 - i * 0.1, 0],
                    scale: [0.5, 1.5 - i * 0.15, 0],
                  }}
                  transition={{
                    duration: 0.85,
                    delay: i * 0.04,
                    ease: "easeInOut",
                  }}
                />
              );
            })}

            {/* Main flying name */}
            <motion.div
              className="absolute"
              style={{ left: 0, top: 0 }}
              initial={{
                x: fly.x0,
                y: fly.y0,
                scale: 2.5,
                opacity: 1,
              }}
              animate={{
                x: [fly.x0, (fly.x0 + fly.x1) / 2, fly.x1],
                y: [
                  fly.y0,
                  Math.min(fly.y0, fly.y1) - 80,
                  fly.y1,
                ],
                scale: [2.5, 1.8, 1],
                rotate: [0, -180, -360],
              }}
              exit={{
                opacity: 0,
                scale: 0,
                transition: { duration: 0.15 },
              }}
              transition={{ duration: 0.85, ease: "easeInOut" }}
            >
              <span
                className="block text-3xl md:text-5xl font-black whitespace-nowrap"
                style={{
                  transform: "translate(-50%, -50%)",
                  color: fly.color ?? "#facc15",
                  textShadow: `0 0 20px ${fly.color ?? "#facc15"}, 0 0 40px ${fly.color ?? "#facc15"}80, 0 0 80px ${fly.color ?? "#facc15"}40`,
                }}
              >
                {fly.name}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
