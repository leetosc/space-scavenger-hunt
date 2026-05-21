"use client";

import { Card } from "@space-scavenger-hunt/ui/components/card";
import { useQuery } from "@tanstack/react-query";

import Loader from "@/components/loader";
import { MissionCountdown } from "@/components/mission-countdown";
import { ICON_MAP } from "@/lib/icons";
import { trpc } from "@/utils/trpc";

function formatElapsed(seconds: number | null): string {
  if (seconds === null) return "\u2014";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export default function LeaderboardPage() {
  const board = useQuery({
    ...trpc.leaderboard.getCurrent.queryOptions(),
    refetchInterval: 5000,
  });
  const activity = useQuery({
    ...trpc.activity.getState.queryOptions(),
    refetchInterval: 5000,
  });

  if (board.isPending) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-10 text-center">
        <Loader />
        <p className="text-sm text-muted-foreground">Loading leaderboard...</p>
      </div>
    );
  }

  if (board.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-center text-sm text-destructive">
          Could not load the leaderboard. {board.error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">Updated every few seconds.</p>
      </header>

      <MissionCountdown
        status={activity.data?.status}
        deadlineAt={activity.data?.deadlineAt}
        serverNow={activity.data?.serverNow}
      />

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-12 p-3 text-left">#</th>
                <th className="p-3 text-left">Team</th>
                <th className="p-3 text-right">Claimed</th>
                <th className="hidden p-3 text-right sm:table-cell">Rejected</th>
                <th className="hidden p-3 text-right sm:table-cell">Latest claim</th>
                <th className="hidden p-3 text-right md:table-cell">Tiebreak time</th>
              </tr>
            </thead>
            <tbody>
              {board.data.map((row, idx) => {
                const Icon = row.icon ? ICON_MAP[row.icon] : null;

                return (
                  <tr key={row.teamId} className="border-t hover:bg-cyan-400/3">
                    <td className="p-3 font-bold">{idx + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-white"
                          style={{ backgroundColor: row.color ?? "#888" }}
                        >
                          {Icon ? (
                            <Icon className="size-3.5" />
                          ) : (
                            <span className="text-[10px] font-bold">
                              {row.teamName.slice(0, 1)}
                            </span>
                          )}
                        </span>
                        <span className="truncate font-medium">{row.teamName}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap p-3 text-right tabular-nums">
                      {row.claimedCount} / {row.assignedCount}
                    </td>
                    <td className="hidden p-3 text-right tabular-nums sm:table-cell">
                      {row.rejectedCount}
                    </td>
                    <td className="hidden whitespace-nowrap p-3 text-right text-xs text-muted-foreground sm:table-cell">
                      {row.latestClaimAt
                        ? new Date(row.latestClaimAt).toLocaleTimeString()
                        : "\u2014"}
                    </td>
                    <td className="hidden whitespace-nowrap p-3 text-right text-xs tabular-nums text-muted-foreground md:table-cell">
                      {formatElapsed(row.latestClaimElapsedSeconds)}
                    </td>
                  </tr>
                );
              })}
              {board.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
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
