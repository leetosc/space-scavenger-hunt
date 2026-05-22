"use client";

import { Card } from "@space-scavenger-hunt/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { Satellite, Sparkles } from "lucide-react";

import Loader from "@/components/loader";
import { MissionCountdown } from "@/components/mission-countdown";
import { ICON_MAP } from "@/lib/icons";
import { trpc } from "@/utils/trpc";

function formatLatestClaim(value: string | Date | null): string {
  if (!value) return "No rescue logged";
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getProgress(claimed: number, assigned: number): number {
  if (assigned <= 0) return 0;
  return Math.min(100, Math.round((claimed / assigned) * 100));
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
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <header className="relative overflow-hidden border border-cyan-400/20 bg-slate-950/70 px-5 py-6 shadow-[0_0_45px_rgba(6,182,212,0.08)] backdrop-blur-md sm:px-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <div className="absolute -right-16 -top-24 h-56 w-56 rounded-full border border-cyan-300/10" />
        <div className="absolute -right-5 top-8 h-28 w-28 rounded-full border border-indigo-300/10" />
        <div className="relative">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-200">
              <Satellite className="size-3.5" />
              Live rescue telemetry
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-white via-cyan-100 to-indigo-200 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">
                Mission Leaderboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Teams are racing through the station map, rescuing stranded astronauts, and
                climbing the command feed in real time.
              </p>
            </div>
          </div>
        </div>
      </header>

      <MissionCountdown
        status={activity.data?.status}
        deadlineAt={activity.data?.deadlineAt}
        serverNow={activity.data?.serverNow}
      />

      <Card className="overflow-hidden border-cyan-400/20 bg-slate-950/75 p-0 shadow-[0_0_40px_rgba(6,182,212,0.08)] backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-cyan-400/10 bg-slate-900/60 px-4 py-3">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">
            <Sparkles className="size-4" />
            Rescue rankings
          </div>
          <div className="hidden text-xs text-slate-500 sm:block">Updated every few seconds</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="w-12 p-3 text-left">#</th>
                <th className="p-3 text-left">Team</th>
                <th className="p-3 text-right">Rescued</th>
                <th className="hidden p-3 text-right sm:table-cell">Progress</th>
                <th className="hidden p-3 text-right md:table-cell">Latest signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-400/10">
              {board.data.map((row, idx) => {
                const Icon = row.icon ? ICON_MAP[row.icon] : null;
                const progress = getProgress(row.claimedCount, row.assignedCount);

                return (
                  <tr key={row.teamId} className="group hover:bg-cyan-400/5">
                    <td className="p-3 font-mono text-lg font-black text-slate-300">
                      {idx + 1}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-white/10 text-white shadow-[0_0_12px_rgba(255,255,255,0.08)]"
                          style={{ backgroundColor: row.color ?? "#888" }}
                        >
                          {Icon ? (
                            <Icon className="size-4" />
                          ) : (
                            <span className="text-[10px] font-bold">
                              {row.teamName.slice(0, 1)}
                            </span>
                          )}
                        </span>
                        <span className="truncate font-semibold text-slate-100">
                          {row.teamName}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap p-3 text-right text-base font-black tabular-nums text-cyan-100">
                      {row.claimedCount} / {row.assignedCount}
                    </td>
                    <td className="hidden p-3 sm:table-cell">
                      <div className="ml-auto flex max-w-40 items-center justify-end gap-2">
                        <div className="h-1.5 w-full overflow-hidden bg-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-300 to-indigo-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="w-10 text-right font-mono text-xs text-slate-400">
                          {progress}%
                        </span>
                      </div>
                    </td>
                    <td className="hidden whitespace-nowrap p-3 text-right text-xs tabular-nums text-slate-400 md:table-cell">
                      {formatLatestClaim(row.latestClaimAt)}
                    </td>
                  </tr>
                );
              })}
              {board.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No teams have launched yet.
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
