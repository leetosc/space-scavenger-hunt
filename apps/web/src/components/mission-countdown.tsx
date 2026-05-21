"use client";

import { cn } from "@space-scavenger-hunt/ui/lib/utils";
import { Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type MissionCountdownProps = {
  status?: string | null;
  deadlineAt?: Date | string | null;
  serverNow?: Date | string | null;
  className?: string;
};

function toTime(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function formatRemaining(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function MissionCountdown({
  status,
  deadlineAt,
  serverNow,
  className,
}: MissionCountdownProps) {
  const deadlineMs = toTime(deadlineAt);
  const serverNowMs = toTime(serverNow);
  const clientOffsetMs = useMemo(() => {
    if (!serverNowMs) return 0;
    return serverNowMs - Date.now();
  }, [serverNowMs]);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (status !== "ACTIVE" || !deadlineMs) return null;

  const remainingSeconds = Math.max(
    0,
    Math.ceil((deadlineMs - (nowMs + clientOffsetMs)) / 1000),
  );

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-none border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-cyan-100 shadow-sm",
        className,
      )}
      aria-label={`Mission time remaining ${formatRemaining(remainingSeconds)}`}
    >
      <Clock className="size-4" aria-hidden="true" />
      <div className="leading-none">
        <p className="text-[10px] font-medium uppercase tracking-widest text-cyan-200/80">
          Time remaining
        </p>
        <p className="font-mono text-lg font-bold tabular-nums">
          {formatRemaining(remainingSeconds)}
        </p>
      </div>
    </div>
  );
}
