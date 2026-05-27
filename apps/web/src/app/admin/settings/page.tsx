"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { Input } from "@space-scavenger-hunt/ui/components/input";
import { Label } from "@space-scavenger-hunt/ui/components/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { RadioTower, Save, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  buttonInteraction,
  fadeInUp,
  scaleIn,
  staggerContainer,
} from "@/lib/animations";
import { trpc } from "@/utils/trpc";

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery(trpc.activity.getSettings.queryOptions());
  const [maxTeams, setMaxTeams] = useState("4");

  useEffect(() => {
    if (settingsQuery.data) {
      setMaxTeams(String(settingsQuery.data.maxTeams));
    }
  }, [settingsQuery.data]);

  const updateSettings = useMutation({
    ...trpc.activity.updateSettings.mutationOptions(),
    onSuccess: () => {
      toast.success("Settings updated");
      queryClient.invalidateQueries({
        queryKey: trpc.activity.getSettings.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.activity.validateSetup.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.team.getConfig.queryKey(),
      });
    },
    onError: (err) => toast.error(err.message),
  });

  const parsedMaxTeams = Number(maxTeams);
  const canSave = Number.isInteger(parsedMaxTeams) && parsedMaxTeams > 0;

  return (
    <motion.div
      className="w-full max-w-4xl space-y-6"
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
            Mission parameters
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure runtime game limits without redeploying.
          </p>
        </div>
      </motion.header>

      <motion.div variants={scaleIn}>
        <Card className="overflow-hidden border-cyan-400/25 bg-slate-950/55 p-0 shadow-[0_0_30px_rgba(34,211,238,0.08)] backdrop-blur">
          <div className="border-b border-cyan-400/15 bg-[linear-gradient(90deg,rgba(34,211,238,0.14),rgba(15,23,42,0.6),rgba(132,204,22,0.08))] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center border border-cyan-400/35 bg-cyan-400/10 text-cyan-300 shadow-[inset_0_0_18px_rgba(34,211,238,0.12)]">
                <Settings2 className="size-4" />
              </div>
              <div>
                <h2 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-slate-100">
                  Team Capacity
                </h2>
                <p className="text-xs text-muted-foreground">
                  Controls how many teams are required before kickoff
                  assignment.
                </p>
              </div>
            </div>
          </div>

          <form
            className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSave) return;
              updateSettings.mutate({ maxTeams: parsedMaxTeams });
            }}
          >
            <div className="border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]">
              <Label
                htmlFor="max-teams"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75"
              >
                Max teams
              </Label>
              <Input
                id="max-teams"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={maxTeams}
                onChange={(event) => setMaxTeams(event.target.value)}
                className="mt-2 font-mono"
              />
            </div>
            <motion.div {...buttonInteraction}>
              <Button
                type="submit"
                disabled={
                  !canSave ||
                  updateSettings.isPending ||
                  settingsQuery.isPending
                }
                className="h-10 w-full justify-center sm:w-auto"
              >
                <Save data-icon="inline-start" className="size-4" />
                Save settings
              </Button>
            </motion.div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}
