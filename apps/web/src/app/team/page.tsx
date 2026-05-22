"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { Input } from "@space-scavenger-hunt/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Images, Pencil, Radar, Trophy, X, Zap } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { IconPicker } from "@/components/icon-picker";
import { MissionCountdown } from "@/components/mission-countdown";
import { TeamIcon } from "@/components/team-icon";
import {
  staggerContainer,
  staggerContainerSlow,
  fadeInUp,
  fadeIn,
  scaleIn,
  slideInLeft,
  popIn,
  buttonInteraction,
  springTransition,
} from "@/lib/animations";
import { trpc } from "@/utils/trpc";

function filterAstronautCode(value: string): string {
  return value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4);
}

export default function TeamPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [manualCode, setManualCode] = useState("");
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamIcon, setTeamIcon] = useState("Rocket");
  const { data: session, isPending } = authClient.useSession();
  const activity = useQuery({
    ...trpc.activity.getState.queryOptions(),
    refetchInterval: 5000,
  });
  const dashboard = useQuery({
    ...trpc.team.getDashboard.queryOptions(),
    refetchInterval: 4000,
    enabled: !!session,
  });
  const updateTeam = useMutation({
    ...trpc.team.updateMine.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.team.getDashboard.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.leaderboard.getCurrent.queryKey() });
      setIsEditingTeam(false);
      toast.success("Team updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (isPending) return;
    if (!session) router.push("/login");
  }, [isPending, session, router]);

  useEffect(() => {
    if (activity.data?.status === "SETUP" || activity.data?.status === "TEAM_ASSIGNMENT") {
      router.push("/waiting" as Route);
    }
  }, [activity.data?.status, router]);

  useEffect(() => {
    if (!dashboard.data || isEditingTeam) return;
    setTeamName(dashboard.data.team.name);
    setTeamIcon(dashboard.data.team.icon ?? "Rocket");
  }, [dashboard.data, isEditingTeam]);

  if (!dashboard.data) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        Loading team dashboard...
      </div>
    );
  }

  const { team, players, assignedCount, claimedCount, progress, claims } = dashboard.data;

  return (
    <motion.div
      className="mx-auto max-w-3xl px-6 py-10 space-y-6"
      variants={staggerContainerSlow}
      initial="hidden"
      animate="visible"
    >
      {/* Team header */}
      <motion.header
        className="rounded-xl p-6 text-white"
        style={{ background: team.color ? `linear-gradient(135deg, ${team.color}, #000)` : "#1f2937" }}
        variants={fadeInUp}
      >
        <p className="text-xs uppercase tracking-wide opacity-70">Your team</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <TeamIcon
            icon={team.icon}
            color={team.color}
            name={team.name}
            className="h-10 w-10 bg-white/15 text-sm font-bold ring-1 ring-white/20"
          />
          <h1 className="min-w-0 flex-1 text-3xl font-bold leading-tight">{team.name}</h1>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-white/65 hover:bg-white/10 hover:text-white"
            aria-label="Edit team name and icon"
            title="Edit team"
            onClick={() => {
              setTeamName(team.name);
              setTeamIcon(team.icon ?? "Rocket");
              setIsEditingTeam((value) => !value);
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
        </div>
        <AnimatePresence>
          {isEditingTeam ? (
            <motion.form
              className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-white/15 bg-black/15 p-2"
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              onSubmit={(e) => {
                e.preventDefault();
                const nextName = teamName.trim();
                if (!nextName) return;
                updateTeam.mutate({ name: nextName, icon: teamIcon });
              }}
            >
              <IconPicker value={teamIcon} onChange={setTeamIcon} />
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                maxLength={60}
                aria-label="Team name"
                className="h-8 min-w-0 flex-1 border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:border-white/50 focus-visible:ring-white/20"
              />
              <Button
                type="submit"
                size="icon-sm"
                variant="ghost"
                className="text-white/70 hover:bg-white/10 hover:text-white"
                disabled={updateTeam.isPending || !teamName.trim()}
                aria-label="Save team changes"
                title="Save"
              >
                <Check className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="text-white/70 hover:bg-white/10 hover:text-white"
                disabled={updateTeam.isPending}
                aria-label="Cancel team edit"
                title="Cancel"
                onClick={() => {
                  setTeamName(team.name);
                  setTeamIcon(team.icon ?? "Rocket");
                  setIsEditingTeam(false);
                }}
              >
                <X className="size-4" />
              </Button>
            </motion.form>
          ) : null}
        </AnimatePresence>
        <p className="mt-2 text-sm">
          {claimedCount} / {assignedCount} astronauts claimed
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/20 px-3 py-1.5 text-sm">
          <Zap className="size-4 text-cyan-200" />
          <span className="font-mono font-semibold">
            {team.signalBoostBalance} Signal Boost{team.signalBoostBalance === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded bg-white/20">
          <motion.div
            className="h-full rounded bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(progress * 100)}%` }}
            transition={{ ...springTransition, delay: 0.3 }}
          />
        </div>
      </motion.header>

      <motion.div variants={fadeInUp}>
        <MissionCountdown
          status={activity.data?.status}
          deadlineAt={activity.data?.deadlineAt}
          serverNow={activity.data?.serverNow}
          className="w-full justify-center"
        />
      </motion.div>

      {/* Manual code input */}
      <motion.div variants={fadeInUp}>
        <Card className="p-6 border-cyan-500/20 bg-slate-950/40">
          <h2 className="font-mono text-xs tracking-widest text-cyan-400 uppercase mb-1">
            Manual Telemetry Uplink
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Enter the 4-letter code from an astronaut tag if NFC scanning is unavailable.
          </p>
          <form
            className="flex flex-col items-center gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCode.length !== 4) return;
              router.push(`/astronaut/${manualCode}` as Route);
            }}
          >
            <motion.div
              whileFocus={{ scale: 1.02 }}
            >
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(filterAstronautCode(e.target.value))}
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={4}
                placeholder="----"
                aria-label="Astronaut scan code"
                className="h-16 w-48 text-center text-3xl font-mono tracking-[0.5em] uppercase border-cyan-500/30 bg-slate-900/80 text-cyan-100 placeholder:text-slate-600 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/30"
              />
            </motion.div>
            <motion.div {...buttonInteraction}>
              <Button
                type="submit"
                disabled={manualCode.length !== 4}
                className="font-mono tracking-widest uppercase"
              >
                Establish Uplink
              </Button>
            </motion.div>
          </form>
        </Card>
      </motion.div>

      {/* Roster */}
      <motion.div variants={fadeInUp}>
        <Card className="p-4">
          <h2 className="font-bold mb-2">Roster</h2>
          <motion.ul
            className="grid grid-cols-2 gap-1 text-sm"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {players.map((p) => (
              <motion.li key={p.id} variants={slideInLeft}>
                {p.name}
              </motion.li>
            ))}
          </motion.ul>
        </Card>
      </motion.div>

      {/* Successful attempts */}
      <motion.div variants={fadeInUp}>
        <Card className="p-4">
          <h2 className="font-bold mb-2">Successful attempts</h2>
          {claims.length === 0 ? (
            <p className="text-sm text-muted-foreground">No successful attempts yet. Get scanning!</p>
          ) : (
            <ul className="divide-y">
              <AnimatePresence>
                {claims.map((c, idx) => (
                  <motion.li
                    key={c.astronautId}
                    className="py-2 flex items-center justify-between"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springTransition, delay: idx * 0.06 }}
                  >
                    <motion.span
                      className="font-medium"
                      variants={popIn}
                      initial="hidden"
                      animate="visible"
                    >
                      {c.astronautName}
                    </motion.span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.claimedAt).toLocaleString()}
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Card>
      </motion.div>

      <motion.div className="flex flex-wrap justify-center gap-3" variants={fadeIn}>
        <Link
          href="/hints"
          className="inline-flex h-9 items-center justify-center gap-1.5 border border-emerald-400/25 bg-emerald-400/10 px-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100 transition-colors hover:bg-emerald-400/15"
        >
          <Radar className="size-4" />
          Hints
        </Link>
        <Link
          href="/leaderboard"
          className="inline-flex h-9 items-center justify-center gap-1.5 border border-cyan-400/25 bg-cyan-400/10 px-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100 transition-colors hover:bg-cyan-400/15"
        >
          <Trophy className="size-4" />
          Leaderboard
        </Link>
        <Link
          href="/submissions"
          className="inline-flex h-9 items-center justify-center gap-1.5 border border-indigo-400/25 bg-indigo-400/10 px-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-indigo-100 transition-colors hover:bg-indigo-400/15"
        >
          <Images className="size-4" />
          Submissions
        </Link>
      </motion.div>
    </motion.div>
  );
}
