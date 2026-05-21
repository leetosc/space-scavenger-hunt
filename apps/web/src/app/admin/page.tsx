"use client";

import { Card } from "@space-scavenger-hunt/ui/components/card";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4 gap-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const validate = useQuery(trpc.activity.validateSetup.queryOptions());

  if (!validate.data) {
    return <p className="text-sm text-muted-foreground">Loading setup status...</p>;
  }

  const { activity, counts, issues, ready } = validate.data;

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Mission Control</h1>
          <p className="text-sm text-muted-foreground">
            Activity status: <span className="font-mono">{activity.status}</span>
          </p>
        </div>
        <span
          className={`rounded px-2 py-1 text-xs font-medium ${ready ? "bg-green-500/15 text-green-600" : "bg-amber-500/15 text-amber-700"}`}
        >
          {ready ? "Ready" : "Setup incomplete"}
        </span>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Teams" value={counts.teams} />
        <Stat label="Players" value={counts.players} />
        <Stat label="Unassigned" value={counts.unassignedPlayers} />
        <Stat label="Astronauts" value={counts.astronauts} />
        <Stat label="Assignments" value={counts.assignments} />
      </div>

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
    </div>
  );
}
