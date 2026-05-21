"use client";

import { Card } from "@space-scavenger-hunt/ui/components/card";
import { useQuery } from "@tanstack/react-query";

import { ICON_MAP } from "@/lib/icons";
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
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">Updated every few seconds.</p>
      </header>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left w-12">#</th>
                <th className="p-3 text-left">Team</th>
                <th className="p-3 text-right">Claimed</th>
                <th className="p-3 text-right hidden sm:table-cell">Rejected</th>
                <th className="p-3 text-right hidden sm:table-cell">Latest claim</th>
              </tr>
            </thead>
            <tbody>
              {board.data.map((row, idx) => (
                <tr key={row.teamId} className="border-t">
                  <td className="p-3 font-bold">{idx + 1}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const Icon = row.icon ? ICON_MAP[row.icon] : null;
                        return (
                          <span
                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-white"
                            style={{ backgroundColor: row.color ?? "#888" }}
                          >
                            {Icon ? <Icon className="size-3.5" /> : <span className="text-[10px] font-bold">{row.teamName.slice(0, 1)}</span>}
                          </span>
                        );
                      })()}
                      <span className="font-medium truncate">{row.teamName}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right tabular-nums whitespace-nowrap">
                    {row.claimedCount} / {row.assignedCount}
                  </td>
                  <td className="p-3 text-right tabular-nums hidden sm:table-cell">{row.rejectedCount}</td>
                  <td className="p-3 text-right text-xs text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                    {row.latestClaimAt ? new Date(row.latestClaimAt).toLocaleTimeString() : "\u2014"}
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
        </div>
      </Card>
    </div>
  );
}
