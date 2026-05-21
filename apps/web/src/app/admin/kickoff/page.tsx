"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { Input } from "@space-scavenger-hunt/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
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
        <Card className="p-4 gap-3">
          <div className="flex max-w-xs flex-col gap-1.5">
            <label htmlFor="time-limit-minutes" className="text-xs font-medium text-muted-foreground">
              Activity time limit (minutes)
            </label>
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
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Start team assignment", onClick: () => start.mutate(), disabled: state.status !== "SETUP" || start.isPending, variant: "default" as const },
              { label: "Spin next player", onClick: () => spin.mutate(), disabled: state.status !== "TEAM_ASSIGNMENT" || spin.isPending, variant: "secondary" as const },
              { label: "Auto-assign remaining", onClick: () => autoAssign.mutate(), disabled: state.status !== "TEAM_ASSIGNMENT" || autoAssign.isPending, variant: "secondary" as const },
              { label: "Reset assignments", onClick: () => { if (confirm("Reset all team assignments?")) reset.mutate(); }, disabled: state.status === "ACTIVE" || state.status === "FINISHED" || reset.isPending, variant: "secondary" as const },
              { label: "Begin activity", onClick: handleBeginActivity, disabled: state.status !== "TEAM_ASSIGNMENT" || begin.isPending || state.assignedCount === 0, variant: "default" as const },
            ].map((btn) => (
              <motion.div key={btn.label} {...buttonInteraction}>
                <Button
                  variant={btn.variant}
                  disabled={btn.disabled}
                  onClick={btn.onClick}
                >
                  {btn.label}
                </Button>
              </motion.div>
            ))}
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
    </motion.div>
  );
}
