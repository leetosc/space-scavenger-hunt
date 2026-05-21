"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { TeamIcon } from "@/components/team-icon";
import { trpc } from "@/utils/trpc";

export default function AdminKickoffPage() {
  const queryClient = useQueryClient();
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

  const state = stateQuery.data;
  if (!state) return <p className="text-sm text-muted-foreground">Loading kickoff state...</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="flex items-center justify-between">
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
      </header>

      <Card className="p-4 gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={state.status !== "SETUP" || start.isPending}
            onClick={() => start.mutate()}
          >
            Start team assignment
          </Button>
          <Button
            variant="secondary"
            disabled={state.status !== "TEAM_ASSIGNMENT" || spin.isPending}
            onClick={() => spin.mutate()}
          >
            Spin next player
          </Button>
          <Button
            variant="secondary"
            disabled={state.status !== "TEAM_ASSIGNMENT" || autoAssign.isPending}
            onClick={() => autoAssign.mutate()}
          >
            Auto-assign remaining
          </Button>
          <Button
            variant="secondary"
            disabled={state.status === "ACTIVE" || state.status === "FINISHED" || reset.isPending}
            onClick={() => {
              if (confirm("Reset all team assignments?")) reset.mutate();
            }}
          >
            Reset assignments
          </Button>
          <Button
            disabled={state.status !== "TEAM_ASSIGNMENT" || begin.isPending || state.assignedCount === 0}
            onClick={() => begin.mutate()}
          >
            Begin activity
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-4 min-h-[120px]">
          <h2 className="font-bold mb-2">Unassigned ({state.unassignedPlayers.length})</h2>
          {state.unassignedPlayers.length === 0 ? (
            <p className="text-sm text-muted-foreground">All players assigned.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {state.unassignedPlayers.map((p) => (
                <li key={p.id}>{p.name}</li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {state.teams.map((team) => (
            <Card key={team.id} className="p-4 min-h-[120px]">
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
                  {team.players.map((p) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
