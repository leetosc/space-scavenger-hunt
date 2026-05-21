"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { Input } from "@space-scavenger-hunt/ui/components/input";
import { Label } from "@space-scavenger-hunt/ui/components/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
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

function Stat({ label, value, idx }: { label: string; value: string | number; idx: number }) {
  return (
    <motion.div
      variants={popIn}
      initial="hidden"
      animate="visible"
      transition={{ delay: idx * 0.08 }}
    >
      <Card className="p-4 gap-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
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

  return (
    <motion.div
      className="space-y-6 max-w-4xl"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.header
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-2"
        variants={fadeInUp}
      >
        <div>
          <h1 className="text-2xl font-bold">Mission Control</h1>
          <p className="text-sm text-muted-foreground">
            Activity status: <span className="font-mono">{activity.status}</span>
          </p>
        </div>
        <motion.span
          className={`rounded px-2 py-1 text-xs font-medium ${ready ? "bg-green-500/15 text-green-600" : "bg-amber-500/15 text-amber-700"}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {ready ? "Ready" : "Setup incomplete"}
        </motion.span>
      </motion.header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Teams" value={counts.teams} idx={0} />
        <Stat label="Players" value={counts.players} idx={1} />
        <Stat label="Unassigned" value={counts.unassignedPlayers} idx={2} />
        <Stat label="Astronauts" value={counts.astronauts} idx={3} />
        <Stat label="Assignments" value={counts.assignments} idx={4} />
      </div>

      <motion.div variants={fadeInUp}>
        <Card className="p-4 gap-4">
          <div>
            <h2 className="font-bold">Testing state controls</h2>
            <p className="text-sm text-muted-foreground">
              Move the activity between statuses while testing admin and player flows.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-3 items-end">
            <div>
              <Label htmlFor="activity-status" className="mb-1.5 block">
                Activity status
              </Label>
              <select
                id="activity-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as (typeof ACTIVITY_STATUSES)[number])
                }
                className="flex h-9 w-full items-center border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50 dark:bg-input/30"
              >
                {ACTIVITY_STATUSES.map((activityStatus) => (
                  <option key={activityStatus} value={activityStatus}>
                    {activityStatus}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="activity-time-limit" className="mb-1.5 block">
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
                Save state
              </Button>
            </motion.div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={fadeIn}>
        {issues.length > 0 ? (
          <Card className="p-4 gap-2">
            <h2 className="font-bold">Setup issues</h2>
            <ul className="list-disc pl-5 text-sm">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card className="p-4">
            <p className="text-sm">Setup looks good. Head to Kickoff when you are ready to launch.</p>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}
