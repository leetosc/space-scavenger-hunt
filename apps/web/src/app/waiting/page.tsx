"use client";

import { Card } from "@space-scavenger-hunt/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  SETUP: {
    title: "Mission has not launched yet",
    body: "Mission control is preparing. Hang tight - this page will update automatically.",
  },
  TEAM_ASSIGNMENT: {
    title: "Crew assignment in progress",
    body: "Teams are being assigned on the big screen. Watch the kickoff display!",
  },
  ACTIVE: {
    title: "Mission underway",
    body: "Redirecting to your team dashboard.",
  },
  FINISHED: {
    title: "Mission complete",
    body: "Head to the leaderboard to see the final standings.",
  },
};

export default function WaitingPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const activity = useQuery({
    ...trpc.activity.getState.queryOptions(),
    refetchInterval: 3000,
  });
  const me = useQuery({
    ...trpc.player.me.queryOptions(),
    enabled: !!session,
  });

  useEffect(() => {
    if (isPending) return;
    if (!session) router.push("/login");
  }, [isPending, session, router]);

  useEffect(() => {
    if (activity.data?.status === "ACTIVE") router.push("/team");
    if (activity.data?.status === "FINISHED") router.push("/leaderboard");
  }, [activity.data?.status, router]);

  if (!activity.data || !me.data) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  const copy = STATUS_COPY[activity.data.status] ?? STATUS_COPY.SETUP!;

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <Card className="p-8 gap-3 text-center">
        <h1 className="text-3xl font-bold">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.body}</p>
        {me.data.player ? (
          <p className="text-xs text-muted-foreground mt-4">
            Signed in as {me.data.player.name}
            {me.data.player.team ? ` - Team ${me.data.player.team.name}` : " - no team yet"}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
