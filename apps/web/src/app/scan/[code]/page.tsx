"use client";

import { Card } from "@space-scavenger-hunt/ui/components/card";
import { useMutation } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef } from "react";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export default function ScanPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const scanMutation = useMutation(trpc.scan.handleScan.mutationOptions());
  const calledRef = useRef(false);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.push(`/login?next=/scan/${code}` as Route);
      return;
    }
    if (calledRef.current) return;
    calledRef.current = true;
    scanMutation.mutate(
      { code },
      {
        onSuccess: (data) => {
          if (data.attemptId && (data.status === "CREATED_ATTEMPT" || data.status === "EXISTING_ATTEMPT")) {
            router.push(`/attempt/${data.attemptId}` as Route);
          }
        },
      },
    );
  }, [session, isPending, code, router, scanMutation]);

  if (scanMutation.data) {
    const ok =
      scanMutation.data.status === "CREATED_ATTEMPT" ||
      scanMutation.data.status === "EXISTING_ATTEMPT";
    return (
      <div className="mx-auto max-w-lg px-6 py-10">
        <Card className="p-6 text-center gap-3">
          <h1 className="text-2xl font-bold">
            {ok ? "Challenge unlocked" : "Scan blocked"}
          </h1>
          <p className="text-sm text-muted-foreground">{scanMutation.data.message}</p>
          {scanMutation.data.attemptId ? (
            <a
              className="text-sm font-medium text-blue-600 underline"
              href={`/attempt/${scanMutation.data.attemptId}`}
            >
              Go to challenge
            </a>
          ) : null}
        </Card>
      </div>
    );
  }

  if (scanMutation.error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-10">
        <Card className="p-6 text-center gap-3">
          <h1 className="text-2xl font-bold">Scan failed</h1>
          <p className="text-sm text-muted-foreground">{scanMutation.error.message}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center">
      <p className="text-sm text-muted-foreground">Validating scan...</p>
    </div>
  );
}
