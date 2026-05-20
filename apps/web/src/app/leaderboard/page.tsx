"use client";

import { Card } from "@space-scavenger-hunt/ui/components/card";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

export default function LeaderboardPage() {
  const board = useQuery({
    ...trpc.leaderboard.getCurrent.queryOptions(),
    refetchInterval: 5000,
  });

  if (!board.data) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Loading leaderboard...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">Updated every few seconds.</p>
      </header>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left w-12">#</th>
              <th className="p-3 text-left">Team</th>
              <th className="p-3 text-right">Claimed</th>
              <th className="p-3 text-right">Rejected</th>
              <th className="p-3 text-right">Latest claim</th>
            </tr>
          </thead>
          <tbody>
            {board.data.map((row, idx) => (
              <tr key={row.teamId} className="border-t">
                <td className="p-3 font-bold">{idx + 1}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold text-white"
                      style={{ backgroundColor: row.color ?? "#888" }}
                    >
                      {row.icon ?? row.teamName.slice(0, 1)}
                    </span>
                    <span className="font-medium">{row.teamName}</span>
                  </div>
                </td>
                <td className="p-3 text-right tabular-nums">
                  {row.claimedCount} / {row.assignedCount}
                </td>
                <td className="p-3 text-right tabular-nums">{row.rejectedCount}</td>
                <td className="p-3 text-right text-xs text-muted-foreground">
                  {row.latestClaimAt ? new Date(row.latestClaimAt).toLocaleTimeString() : "—"}
                </td>
              </tr>
            ))}
            {board.data.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No teams yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
