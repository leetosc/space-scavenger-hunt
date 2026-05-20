"use client";

import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export default function Home() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const activity = useQuery({
    ...trpc.activity.getState.queryOptions(),
    refetchInterval: 5000,
  });
  const me = useQuery({
    ...trpc.player.me.queryOptions(),
    enabled: !!session,
  });

  useEffect(() => {
    if (sessionPending) return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (!activity.data || !me.data) return;
    if (me.data.user.role === "ADMIN") {
      router.push("/admin");
      return;
    }
    const status = activity.data.status;
    if (status === "ACTIVE" || status === "FINISHED") {
      router.push("/team" as Route);
    } else {
      router.push("/waiting" as Route);
    }
  }, [sessionPending, session, activity.data, me.data, router]);

  return (
    <div className="flex items-center justify-center py-20">
      <Loader />
    </div>
  );
}
