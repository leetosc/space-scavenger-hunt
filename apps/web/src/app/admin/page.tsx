"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { Input } from "@space-scavenger-hunt/ui/components/input";
import { Label } from "@space-scavenger-hunt/ui/components/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  Orbit,
  RadioTower,
  Rocket,
  Save,
  ShieldCheck,
  Sparkles,
  Timer,
  UserRoundX,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  staggerContainer,
  fadeInUp,
  popIn,
  fadeIn,
  buttonInteraction,
} from "@/lib/animations";
import { trpc } from "@/utils/trpc";

const ACTIVITY_STATUSES = ["SETUP", "TEAM_ASSIGNMENT", "ACTIVE", "FINISHED"] as const;

function Stat({
  label,
  value,
  icon: Icon,
  idx,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  idx: number;
}) {
  return (
    <motion.div
      variants={popIn}
      initial="hidden"
      animate="visible"
      transition={{ delay: idx * 0.08 }}
    >
      <Card className="overflow-hidden border-cyan-400/20 bg-slate-950/50 p-0 shadow-[0_0_24px_rgba(34,211,238,0.06)]">
        <div className="border-b border-cyan-400/15 bg-slate-900/55 px-3 py-2">
          <div className="flex items-center gap-1.5 text-cyan-300/75">
            <Icon className="size-3.5" />
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em]">{label}</p>
          </div>
        </div>
        <div className="px-3 py-3">
          <p className="font-mono text-2xl font-bold tabular-nums text-slate-100">{value}</p>
        </div>
      </Card>
    </motion.div>
  );
}

export default function AdminOverviewPage() {
  const queryClient = useQueryClient();
  const validate = useQuery(trpc.activity.validateSetup.queryOptions());
  const [status, setStatus] = useState<(typeof ACTIVITY_STATUSES)[number]>("SETUP");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("30");

  useEffect(() => {
    const activity = validate.data?.activity;
    if (!activity) return;
    if (ACTIVITY_STATUSES.includes(activity.status as (typeof ACTIVITY_STATUSES)[number])) {
      setStatus(activity.status as (typeof ACTIVITY_STATUSES)[number]);
    }
    if (activity.timeLimitMinutes) {
      setTimeLimitMinutes(String(activity.timeLimitMinutes));
    }
  }, [validate.data?.activity]);

  const setStateMutation = useMutation({
    ...trpc.activity.adminSetState.mutationOptions(),
    onSuccess: () => {
      toast.success("Activity state updated");
      queryClient.invalidateQueries({ queryKey: trpc.activity.validateSetup.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.activity.getCurrent.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.activity.getState.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.kickoff.getDisplayState.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.leaderboard.getCurrent.queryKey() });
    },
    onError: (err) => toast.error(err.message),
  });

  if (!validate.data) {
    return <p className="text-sm text-muted-foreground">Loading setup status...</p>;
  }

  const { activity, counts, issues, ready } = validate.data;
  const setupPercent = Math.round(
    ((Math.min(counts.teams, 4) +
      (counts.players > 0 ? 1 : 0) +
      (counts.astronauts > 0 ? 1 : 0) +
      (counts.unassignedPlayers === 0 && counts.players > 0 ? 1 : 0)) /
      7) *
      100,
  );
  const statusIndex = ACTIVITY_STATUSES.indexOf(activity.status as (typeof ACTIVITY_STATUSES)[number]);
  const statusPercent = Math.round(((statusIndex >= 0 ? statusIndex + 1 : 1) / ACTIVITY_STATUSES.length) * 100);

  return (
    <motion.div
      className="space-y-6 max-w-6xl"
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
            <span
              className={`size-1.5 rounded-full shadow-[0_0_10px_rgba(110,231,183,0.9)] ${
                ready ? "bg-emerald-300" : "bg-amber-300"
              }`}
            />
            Mission command uplink
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-sm text-muted-foreground">
            Activity state <span className="font-mono text-cyan-300">{activity.status}</span> / readiness
            matrix <span className="font-mono text-foreground">{setupPercent}%</span>
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-3 border border-cyan-400/20 bg-slate-950/50 text-center shadow-[0_0_24px_rgba(34,211,238,0.08)]">
            {[
              ["Status", activity.status],
              ["Ready", ready ? "YES" : "NO"],
              ["Issues", issues.length.toString()],
            ].map(([label, value]) => (
              <div key={label} className="min-w-24 border-r border-cyan-400/15 px-3 py-2 last:border-r-0">
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/70">
                  {label}
                </div>
                <div className="mt-1 truncate font-mono text-xs font-bold text-slate-100">{value}</div>
              </div>
            ))}
          </div>
          <motion.span
            className={`inline-flex h-10 items-center justify-center gap-1.5 border px-3 font-mono text-xs font-bold uppercase tracking-wide ${
              ready
                ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                : "border-amber-300/30 bg-amber-300/10 text-amber-200"
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {ready ? <BadgeCheck className="size-4" /> : <AlertTriangle className="size-4" />}
            {ready ? "Ready" : "Setup incomplete"}
          </motion.span>
        </div>
      </motion.header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Stat label="Teams" value={counts.teams} icon={ShieldCheck} idx={0} />
        <Stat label="Players" value={counts.players} icon={UsersRound} idx={1} />
        <Stat label="Unassigned" value={counts.unassignedPlayers} icon={UserRoundX} idx={2} />
        <Stat label="Astronauts" value={counts.astronauts} icon={Rocket} idx={3} />
        <Stat label="Assignments" value={counts.assignments} icon={Orbit} idx={4} />
        <Stat label="Hints" value={counts.activeHints} icon={Sparkles} idx={5} />
        <Stat label="Boosts" value={counts.signalBoosts} icon={RadioTower} idx={6} />
      </div>

      <motion.div variants={fadeInUp}>
        <Card className="overflow-hidden border-cyan-400/25 bg-slate-950/55 p-0 shadow-[0_0_30px_rgba(34,211,238,0.08)] backdrop-blur">
          <div className="border-b border-cyan-400/15 bg-[linear-gradient(90deg,rgba(34,211,238,0.14),rgba(15,23,42,0.6),rgba(132,204,22,0.08))] px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center border border-cyan-400/35 bg-cyan-400/10 text-cyan-300 shadow-[inset_0_0_18px_rgba(34,211,238,0.12)]">
                  <RadioTower className="size-4" />
                </div>
                <div>
                  <h2 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-slate-100">
                    Testing State Controls
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Move the activity between statuses while testing admin and player flows.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 border border-cyan-400/20 bg-slate-950/70 px-2.5 py-1.5 text-xs">
                <span className="text-muted-foreground">Phase</span>
                <span className="font-mono font-semibold text-cyan-300">{statusPercent}%</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
            <div className="border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]">
              <Label
                htmlFor="activity-status"
                className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75"
              >
                Activity status
              </Label>
              <select
                id="activity-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as (typeof ACTIVITY_STATUSES)[number])
                }
                className="flex h-9 w-full items-center border border-cyan-400/20 bg-slate-950/60 px-2.5 py-1.5 font-mono text-sm text-slate-100 outline-none focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300/40"
              >
                {ACTIVITY_STATUSES.map((activityStatus) => (
                  <option key={activityStatus} value={activityStatus}>
                    {activityStatus}
                  </option>
                ))}
              </select>
            </div>
            <div className="border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]">
              <Label
                htmlFor="activity-time-limit"
                className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75"
              >
                <Timer className="size-3.5" />
                Time limit
              </Label>
              <Input
                id="activity-time-limit"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={timeLimitMinutes}
                onChange={(event) => setTimeLimitMinutes(event.target.value)}
                className="font-mono"
              />
            </div>
            <motion.div {...buttonInteraction}>
              <Button
                type="button"
                disabled={setStateMutation.isPending}
                onClick={() => {
                  const minutes = Number(timeLimitMinutes);
                  if (!Number.isInteger(minutes) || minutes <= 0) {
                    toast.error("Enter a positive whole number of minutes.");
                    return;
                  }
                  setStateMutation.mutate({
                    status,
                    ...(status === "ACTIVE" ? { timeLimitMinutes: minutes } : {}),
                  });
                }}
              >
                <Save data-icon="inline-start" className="size-4" />
                Save state
              </Button>
            </motion.div>
          </div>
          <div className="h-1 bg-slate-800">
            <div
              className="h-full bg-[linear-gradient(90deg,#22d3ee,#84cc16)] shadow-[0_0_14px_rgba(34,211,238,0.55)]"
              style={{ width: `${statusPercent}%` }}
            />
          </div>
        </Card>
      </motion.div>

      <motion.div variants={fadeIn}>
        {issues.length > 0 ? (
          <Card className="relative overflow-hidden border-amber-300/25 bg-slate-950/50 p-0 shadow-[0_0_28px_rgba(251,191,36,0.07)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(251,191,36,0.05)_1px,transparent_1px)] bg-[length:100%_12px]" />
            <div className="relative border-b border-amber-300/15 px-4 py-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200/80">
                Preflight warnings
              </p>
              <h2 className="mt-1 text-sm font-bold uppercase tracking-wide">Setup issues</h2>
            </div>
            <ul className="relative grid gap-2 p-4 text-sm sm:grid-cols-2">
              {issues.map((issue) => (
                <li
                  key={issue}
                  className="flex items-start gap-2 border border-amber-300/15 bg-slate-900/55 px-3 py-2 font-mono text-xs text-slate-200"
                >
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-200" />
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card className="relative overflow-hidden border-emerald-300/25 bg-slate-950/50 p-0 shadow-[0_0_28px_rgba(110,231,183,0.07)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(110,231,183,0.05)_1px,transparent_1px)] bg-[length:100%_12px]" />
            <div className="relative flex items-center gap-3 px-4 py-4">
              <div className="flex size-9 items-center justify-center border border-emerald-300/30 bg-emerald-300/10 text-emerald-200">
                <BadgeCheck className="size-4" />
              </div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-200">
                Setup looks good. Head to Kickoff when you are ready to launch.
              </p>
            </div>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}
