"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@space-scavenger-hunt/ui/components/dialog";
import { Input } from "@space-scavenger-hunt/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  ExternalLink,
  Play,
  Radar,
  RotateCcw,
  Shuffle,
  Timer,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { TeamIcon } from "@/components/team-icon";
import {
  staggerContainer,
  fadeInUp,
  slideInLeft,
  buttonInteraction,
  springTransition,
} from "@/lib/animations";
import { trpc } from "@/utils/trpc";

export default function AdminKickoffPage() {
  const queryClient = useQueryClient();
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("30");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const stateQuery = useQuery({
    ...trpc.kickoff.getDisplayState.queryOptions(),
    refetchInterval: 2000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: trpc.kickoff.getDisplayState.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.activity.getCurrent.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.activity.validateSetup.queryKey() });
  };

  const start = useMutation({
    ...trpc.kickoff.startAssignment.mutationOptions(),
    onSuccess: () => {
      toast.success("Team assignment started. Open /kickoff on the big screen.");
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const spin = useMutation({
    ...trpc.kickoff.spinNextPlayer.mutationOptions(),
    onSuccess: (data) => {
      if (data) toast.success(`${data.player.name} -> ${data.team.name}`);
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const autoAssign = useMutation({
    ...trpc.kickoff.autoAssignRemaining.mutationOptions(),
    onSuccess: () => {
      toast.success("All remaining players assigned");
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const reset = useMutation({
    ...trpc.kickoff.resetAssignments.mutationOptions(),
    onSuccess: () => {
      toast.success("Assignments reset");
      setResetConfirmOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const begin = useMutation({
    ...trpc.kickoff.beginActivity.mutationOptions(),
    onSuccess: () => {
      toast.success("Activity is now ACTIVE. Scanning is enabled.");
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleBeginActivity = () => {
    const minutes = Number(timeLimitMinutes);
    if (!Number.isInteger(minutes) || minutes <= 0) {
      toast.error("Enter a positive whole number of minutes.");
      return;
    }
    begin.mutate({ timeLimitMinutes: minutes });
  };

  const state = stateQuery.data;
  if (!state) return <p className="text-sm text-muted-foreground">Loading kickoff state...</p>;

  const assignmentPercent =
    state.totalPlayers > 0 ? Math.round((state.assignedCount / state.totalPlayers) * 100) : 0;

  const controlButtons: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    disabled: boolean;
    variant: "default" | "secondary" | "outline";
  }[] = [
    {
      label: "Start team assignment",
      icon: Play,
      onClick: () => start.mutate(),
      disabled: state.status !== "SETUP" || start.isPending,
      variant: "default",
    },
    {
      label: "Spin next player",
      icon: Radar,
      onClick: () => spin.mutate(),
      disabled: state.status !== "TEAM_ASSIGNMENT" || spin.isPending,
      variant: "secondary",
    },
    {
      label: "Auto-assign remaining",
      icon: Shuffle,
      onClick: () => autoAssign.mutate(),
      disabled: state.status !== "TEAM_ASSIGNMENT" || autoAssign.isPending,
      variant: "secondary",
    },
    {
      label: "Reset assignments",
      icon: RotateCcw,
      onClick: () => setResetConfirmOpen(true),
      disabled: state.status === "ACTIVE" || state.status === "FINISHED" || reset.isPending,
      variant: "outline",
    },
    {
      label: "Begin activity",
      icon: BadgeCheck,
      onClick: handleBeginActivity,
      disabled: state.status !== "TEAM_ASSIGNMENT" || begin.isPending || state.assignedCount === 0,
      variant: "default",
    },
  ];

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
            <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
            Orbital admin uplink
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Kickoff Controls</h1>
          <p className="text-sm text-muted-foreground">
            Mission state <span className="font-mono text-cyan-300">{state.status}</span> / assignment
            matrix <span className="font-mono text-foreground">{state.assignedCount}</span> of{" "}
            <span className="font-mono text-foreground">{state.totalPlayers}</span>
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-3 border border-cyan-400/20 bg-slate-950/50 text-center shadow-[0_0_24px_rgba(34,211,238,0.08)]">
            {[
              ["Status", state.status],
              ["Assigned", `${state.assignedCount}/${state.totalPlayers}`],
              ["Queue", state.unassignedPlayers.length.toString()],
            ].map(([label, value]) => (
              <div key={label} className="min-w-24 border-r border-cyan-400/15 px-3 py-2 last:border-r-0">
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/70">
                  {label}
                </div>
                <div className="mt-1 truncate font-mono text-xs font-bold text-slate-100">{value}</div>
              </div>
            ))}
          </div>
          <a
            href="/kickoff"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-1.5 border border-cyan-400/30 bg-cyan-400/10 px-3 text-xs font-bold uppercase tracking-wide text-cyan-100 transition-colors hover:bg-cyan-400/20"
          >
            <ExternalLink className="size-3.5" />
            Open display
          </a>
        </div>
      </motion.header>

      <motion.div variants={fadeInUp}>
        <Card className="overflow-hidden border-cyan-400/25 bg-slate-950/55 p-0 shadow-[0_0_30px_rgba(34,211,238,0.08)] backdrop-blur">
          <div className="border-b border-cyan-400/15 bg-[linear-gradient(90deg,rgba(34,211,238,0.14),rgba(15,23,42,0.6),rgba(132,204,22,0.08))] px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center border border-cyan-400/35 bg-cyan-400/10 text-cyan-300 shadow-[inset_0_0_18px_rgba(34,211,238,0.12)]">
                  <UsersRound className="size-4" />
                </div>
                <div>
                  <h2 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-slate-100">
                    Assignment Command
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Live team kickoff controls for the display board.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 border border-cyan-400/20 bg-slate-950/70 px-2.5 py-1.5 text-xs">
                <span className="text-muted-foreground">Status</span>
                <span className="font-mono font-semibold text-cyan-300">{state.status}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(180px,240px)_1fr]">
            <div className="flex flex-col gap-2 border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]">
              <label
                htmlFor="time-limit-minutes"
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                <Timer className="size-3.5" />
                Activity time limit
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="time-limit-minutes"
                  type="number"
                  min={1}
                  max={1440}
                  step={1}
                  inputMode="numeric"
                  value={timeLimitMinutes}
                  disabled={state.status === "ACTIVE" || state.status === "FINISHED"}
                  onChange={(event) => setTimeLimitMinutes(event.target.value)}
                  className="font-mono"
                />
                <span className="text-xs font-medium text-muted-foreground">min</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {controlButtons.map((btn) => {
                  const Icon = btn.icon;
                  return (
                    <motion.div key={btn.label} {...buttonInteraction}>
                      <Button
                        className="w-full justify-start"
                        variant={btn.variant}
                        disabled={btn.disabled}
                        onClick={btn.onClick}
                      >
                        <Icon data-icon="inline-start" className="size-4" />
                        {btn.label}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Assigned: <span className="font-mono text-foreground">{state.assignedCount}</span>/
                  <span className="font-mono text-foreground">{state.totalPlayers}</span>
                </span>
                <span>
                  Remaining:{" "}
                  <span className="font-mono text-foreground">{state.unassignedPlayers.length}</span>
                </span>
                <span>
                  Sync: <span className="font-mono text-cyan-300">{assignmentPercent}%</span>
                </span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div className="space-y-4" variants={fadeInUp}>
        <Card className="relative min-h-[120px] overflow-hidden border-cyan-400/20 bg-slate-950/50 p-0 shadow-[0_0_28px_rgba(34,211,238,0.07)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.05)_1px,transparent_1px)] bg-[length:100%_12px]" />
          <div className="relative flex flex-col gap-3 border-b border-cyan-400/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300/75">
                Holding pattern
              </p>
              <h2 className="mt-1 text-sm font-bold uppercase tracking-wide">
                Unassigned crew ({state.unassignedPlayers.length})
              </h2>
            </div>
            <div className="h-1.5 w-full overflow-hidden bg-slate-800 sm:w-56">
              <div
                className="h-full bg-[linear-gradient(90deg,#22d3ee,#84cc16)] shadow-[0_0_14px_rgba(34,211,238,0.55)]"
                style={{ width: `${assignmentPercent}%` }}
              />
            </div>
          </div>
          {state.unassignedPlayers.length === 0 ? (
            <p className="relative px-4 py-5 font-mono text-xs uppercase tracking-[0.18em] text-emerald-300">
              All crew signals locked to teams.
            </p>
          ) : (
            <motion.ul
              className="relative grid gap-2 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence>
                {state.unassignedPlayers.map((p, index) => (
                  <motion.li
                    key={p.id}
                    variants={slideInLeft}
                    exit={{ opacity: 0, x: 20 }}
                    transition={springTransition}
                    className="flex items-center gap-2 border border-cyan-400/15 bg-slate-900/55 px-3 py-2 font-mono text-xs text-slate-200"
                  >
                    <span className="text-cyan-300/70">{String(index + 1).padStart(2, "0")}</span>
                    <span className="size-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.8)]" />
                    <span className="truncate">{p.name}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </Card>

        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {state.teams.map((team) => (
            <motion.div key={team.id} variants={fadeInUp}>
              <Card
                className="min-h-[180px] overflow-hidden border-cyan-400/15 bg-slate-950/50 p-0 shadow-[0_0_24px_rgba(15,23,42,0.4)]"
                style={{
                  borderColor: team.color ? `${team.color}55` : undefined,
                  boxShadow: team.color ? `0 0 24px ${team.color}18` : undefined,
                }}
              >
                <div className="border-b border-white/10 bg-slate-900/60 px-3 py-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <TeamIcon icon={team.icon} color={team.color} name={team.name} />
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-bold uppercase tracking-wide">{team.name}</h2>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          Team vector
                        </p>
                      </div>
                    </div>
                    <div className="border border-white/10 bg-black/25 px-2 py-1 text-right font-mono">
                      <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Crew</div>
                      <div className="text-sm font-bold text-slate-100">{team.players.length}</div>
                    </div>
                  </div>
                  <div className="h-1 overflow-hidden bg-slate-800">
                    <div
                      className="h-full bg-cyan-300"
                      style={{
                        width: `${
                          state.totalPlayers > 0
                            ? Math.round((team.players.length / state.totalPlayers) * 100)
                            : 0
                        }%`,
                        backgroundColor: team.color ?? undefined,
                      }}
                    />
                  </div>
                </div>
                {team.players.length === 0 ? (
                  <p className="px-3 py-4 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Awaiting crew lock.
                  </p>
                ) : (
                  <ul className="space-y-2 p-3 text-sm">
                    <AnimatePresence>
                      {team.players.map((p, index) => (
                        <motion.li
                          key={p.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={springTransition}
                          className="flex items-center gap-2 border border-white/10 bg-slate-900/55 px-2.5 py-2 font-mono text-xs text-slate-200"
                        >
                          <span className="text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                          <span
                            className="size-1.5 rounded-full bg-cyan-300"
                            style={{ backgroundColor: team.color ?? undefined }}
                          />
                          <span className="truncate">{p.name}</span>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <Dialog
        open={resetConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !reset.isPending) {
            setResetConfirmOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!reset.isPending}>
          <DialogHeader>
            <DialogTitle>Reset team assignments?</DialogTitle>
            <DialogDescription>
              All players will be unassigned from their teams. You can run team assignment again
              from the beginning.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reset.isPending}
              onClick={() => setResetConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={reset.isPending}
              onClick={() => reset.mutate()}
            >
              {reset.isPending ? "Resetting..." : "Reset assignments"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
