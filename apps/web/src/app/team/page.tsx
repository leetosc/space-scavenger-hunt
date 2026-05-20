"use client";

import { Card } from "@space-scavenger-hunt/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export default function TeamPage() {
  const router = useRouter();
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

  useEffect(() => {
    if (isPending) return;
    if (!session) router.push("/login");
  }, [isPending, session, router]);

  useEffect(() => {
    if (activity.data?.status === "SETUP" || activity.data?.status === "TEAM_ASSIGNMENT") {
      router.push("/waiting" as Route);
    }
  }, [activity.data?.status, router]);

  if (!dashboard.data) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        Loading team dashboard...
      </div>
    );
  }

  const { team, players, assignedCount, claimedCount, progress, pendingAttempts, claims } =
    dashboard.data;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <header
        className="rounded-xl p-6 text-white"
        style={{ background: team.color ? `linear-gradient(135deg, ${team.color}, #000)` : "#1f2937" }}
      >
        <p className="text-xs uppercase tracking-wide opacity-70">Your team</p>
        <h1 className="text-3xl font-bold">{team.name}</h1>
        <p className="mt-2 text-sm">
          {claimedCount} / {assignedCount} astronauts claimed
        </p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded bg-white/20">
          <div
            className="h-full rounded bg-white"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </header>

      <Card className="p-4">
        <h2 className="font-bold mb-2">Roster</h2>
        <ul className="grid grid-cols-2 gap-1 text-sm">
          {players.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
      </Card>

      <Card className="p-4">
        <h2 className="font-bold mb-2">In progress</h2>
        {pendingAttempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing in progress. Find and scan an astronaut tag to start a challenge.
          </p>
        ) : (
          <ul className="divide-y">
            {pendingAttempts.map((a) => (
              <li key={a.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{a.astronautName}</p>
                    <p className="text-sm text-muted-foreground">{a.taskPrompt}</p>
                  </div>
                  <Link
                    href={`/attempt/${a.id}` as Route}
                    className="text-sm font-medium text-blue-600 underline whitespace-nowrap"
                  >
                    Open
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Status: {a.status}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-bold mb-2">Claimed astronauts</h2>
        {claims.length === 0 ? (
          <p className="text-sm text-muted-foreground">No claims yet. Get scanning!</p>
        ) : (
          <ul className="divide-y">
            {claims.map((c) => (
              <li key={c.astronautId} className="py-2 flex items-center justify-between">
                <span className="font-medium">{c.astronautName}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.claimedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="text-center">
        <Link href="/leaderboard" className="text-sm underline text-blue-600">
          View leaderboard
        </Link>
      </div>
    </div>
  );
}
