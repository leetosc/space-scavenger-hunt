"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export default function AdminAssignmentsPage() {
  const queryClient = useQueryClient();
  const teamsQuery = useQuery(trpc.team.list.queryOptions());
  const astronautsQuery = useQuery(trpc.astronaut.list.queryOptions());
  const assignmentsQuery = useQuery(trpc.assignment.list.queryOptions());

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: trpc.assignment.list.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.astronaut.list.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.team.list.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.activity.validateSetup.queryKey() });
  };

  const assignMutation = useMutation({
    ...trpc.assignment.assign.mutationOptions(),
    onSuccess: invalidate,
    onError: (err) => toast.error(err.message),
  });
  const unassignMutation = useMutation({
    ...trpc.assignment.unassign.mutationOptions(),
    onSuccess: invalidate,
    onError: (err) => toast.error(err.message),
  });

  const teams = teamsQuery.data ?? [];
  const astronauts = astronautsQuery.data ?? [];
  const assignments = assignmentsQuery.data ?? [];

  const assignmentMap = new Map<string, string>();
  for (const a of assignments) assignmentMap.set(a.astronautId, a.teamId);

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold">Assignments</h1>
        <p className="text-sm text-muted-foreground">
          Map each astronaut to exactly one team. A team can only claim astronauts assigned to it.
        </p>
      </header>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">Astronaut</th>
              {teams.map((t) => (
                <th key={t.id} className="p-3 text-center">
                  {t.name}
                </th>
              ))}
              <th className="p-3 text-right">Clear</th>
            </tr>
          </thead>
          <tbody>
            {astronauts.map((a) => {
              const currentTeam = assignmentMap.get(a.id);
              return (
                <tr key={a.id} className="border-t">
                  <td className="p-3 font-medium">
                    {a.name}
                    <p className="text-xs text-muted-foreground">{a.code}</p>
                  </td>
                  {teams.map((t) => {
                    const selected = currentTeam === t.id;
                    return (
                      <td key={t.id} className="p-3 text-center">
                        <Button
                          size="sm"
                          variant={selected ? "default" : "outline"}
                          onClick={() =>
                            assignMutation.mutate({ teamId: t.id, astronautId: a.id })
                          }
                        >
                          {selected ? "Assigned" : "Assign"}
                        </Button>
                      </td>
                    );
                  })}
                  <td className="p-3 text-right">
                    {currentTeam ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          unassignMutation.mutate({
                            teamId: currentTeam,
                            astronautId: a.id,
                          })
                        }
                      >
                        Clear
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {astronauts.length === 0 && (
              <tr>
                <td colSpan={teams.length + 2} className="p-6 text-center text-muted-foreground">
                  No astronauts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
