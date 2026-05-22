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
      className="space-y-6 max-w-4xl"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.header className="flex items-center justify-between" variants={fadeInUp}>
        <div>
          <h1 className="text-2xl font-bold">Kickoff Controls</h1>
          <p className="text-sm text-muted-foreground">
            Activity status: <span className="font-mono">{state.status}</span> · {state.assignedCount}
            / {state.totalPlayers} players assigned
          </p>
        </div>
        <a
          href="/kickoff"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-none border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
        >
          <ExternalLink className="size-3.5" />
          Open kickoff display
        </a>
      </motion.header>

      <motion.div variants={fadeInUp}>
        <Card className="overflow-hidden border-cyan-400/20 bg-background/80 p-0 shadow-sm">
          <div className="border-b border-border/60 bg-muted/30 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                  <UsersRound className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide">Assignment Command</h2>
                  <p className="text-xs text-muted-foreground">
                    Live team kickoff controls for the display board.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-xs">
                <span className="text-muted-foreground">Status</span>
                <span className="font-mono font-semibold text-cyan-300">{state.status}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(180px,240px)_1fr]">
            <div className="flex flex-col gap-2 rounded-md border border-border/70 bg-muted/20 p-3">
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
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div className="space-y-4" variants={fadeInUp}>
        <Card className="p-4 min-h-[120px]">
          <h2 className="font-bold mb-2">Unassigned ({state.unassignedPlayers.length})</h2>
          {state.unassignedPlayers.length === 0 ? (
            <p className="text-sm text-muted-foreground">All players assigned.</p>
          ) : (
            <motion.ul
              className="text-sm space-y-1"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence>
                {state.unassignedPlayers.map((p) => (
                  <motion.li
                    key={p.id}
                    variants={slideInLeft}
                    exit={{ opacity: 0, x: 20 }}
                    transition={springTransition}
                  >
                    {p.name}
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </Card>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {state.teams.map((team) => (
            <motion.div key={team.id} variants={fadeInUp}>
              <Card className="p-4 min-h-[120px]">
                <div className="flex items-center gap-2 mb-2 min-w-0">
                  <TeamIcon icon={team.icon} color={team.color} name={team.name} />
                  <h2 className="font-bold truncate">
                    {team.name} ({team.players.length})
                  </h2>
                </div>
                {team.players.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No players yet.</p>
                ) : (
                  <ul className="text-sm space-y-1">
                    <AnimatePresence>
                      {team.players.map((p) => (
                        <motion.li
                          key={p.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={springTransition}
                        >
                          {p.name}
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
