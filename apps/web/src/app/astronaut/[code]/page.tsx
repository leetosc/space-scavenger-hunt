"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { cn } from "@space-scavenger-hunt/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useRef } from "react";

import { authClient } from "@/lib/auth-client";
import { ICON_MAP } from "@/lib/icons";
import { trpc } from "@/utils/trpc";

export default function AstronautPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const astronautQuery = useQuery({
    ...trpc.astronaut.getByCode.queryOptions({ code }),
  });

  const scanMutation = useMutation(trpc.scan.handleScan.mutationOptions());
  const scanCalledRef = useRef(false);

  const astronaut = astronautQuery.data;
  const isLoading = astronautQuery.isPending;

  // ---------- Loading ----------
  if (isLoading || sessionPending) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // ---------- Not found ----------
  if (!astronaut) {
    return (
      <div className="mx-auto max-w-lg px-6 py-10">
        <Card className="p-6 text-center space-y-3">
          <h1 className="text-2xl font-bold">Astronaut not found</h1>
          <p className="text-sm text-muted-foreground">
            No astronaut matches the code <code className="bg-muted px-1.5 py-0.5 rounded">{code.toUpperCase()}</code>.
          </p>
          <Link href="/" className="text-sm text-cyan-400 hover:underline">
            Back to home
          </Link>
        </Card>
      </div>
    );
  }

  // ---------- Claim action (logged-in players) ----------
  function handleClaim() {
    if (scanCalledRef.current) return;
    scanCalledRef.current = true;
    scanMutation.mutate(
      { code },
      {
        onSuccess: (data) => {
          if (
            data.attemptId &&
            (data.status === "CREATED_ATTEMPT" ||
              data.status === "EXISTING_ATTEMPT")
          ) {
            router.push(`/attempt/${data.attemptId}` as Route);
          }
        },
        onSettled: () => {
          scanCalledRef.current = false;
        },
      },
    );
  }

  const claimedBy = astronaut.claimedBy;
  const ClaimedTeamIcon = claimedBy?.icon ? ICON_MAP[claimedBy.icon] : null;

  return (
    <div className="mx-auto max-w-lg px-6 py-10 space-y-4">
      {/* Astronaut info */}
      <Card className="p-6 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <code className="bg-muted px-2 py-0.5 rounded text-xs">{astronaut.code}</code>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-sm border",
                astronaut.active
                  ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                  : "border-border/40 text-muted-foreground",
              )}
            >
              {astronaut.active ? "Active" : "Inactive"}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{astronaut.name}</h1>
        </div>

        {astronaut.description && (
          <p className="text-sm text-muted-foreground">{astronaut.description}</p>
        )}

        {astronaut.hint && (
          <div className="border border-border/40 rounded p-3 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-1">Hint</p>
            <p className="text-sm">{astronaut.hint}</p>
          </div>
        )}

        {/* Claim status */}
        {claimedBy && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            <span
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-white"
              style={{ backgroundColor: claimedBy.color ?? "#888" }}
            >
              {ClaimedTeamIcon ? (
                <ClaimedTeamIcon className="size-3.5" />
              ) : (
                <span className="text-[9px] font-bold">
                  {claimedBy.name.slice(0, 1)}
                </span>
              )}
            </span>
            <span className="text-sm">
              Claimed by <span className="font-medium">{claimedBy.name}</span>
            </span>
          </div>
        )}
      </Card>

      {/* Actions (logged-in only) */}
      {session ? (
        <Card className="p-4 space-y-3">
          {scanMutation.data ? (
            <div className="space-y-2">
              <p
                className={cn(
                  "text-sm font-medium",
                  scanMutation.data.status === "CREATED_ATTEMPT" ||
                    scanMutation.data.status === "EXISTING_ATTEMPT"
                    ? "text-emerald-400"
                    : "text-amber-400",
                )}
              >
                {scanMutation.data.status === "CREATED_ATTEMPT" ||
                scanMutation.data.status === "EXISTING_ATTEMPT"
                  ? "Challenge unlocked"
                  : "Cannot claim"}
              </p>
              <p className="text-sm text-muted-foreground">
                {scanMutation.data.message}
              </p>
              {scanMutation.data.attemptId && (
                <Link href={`/attempt/${scanMutation.data.attemptId}` as Route}>
                  <Button size="sm">Go to challenge</Button>
                </Link>
              )}
            </div>
          ) : scanMutation.error ? (
            <p className="text-sm text-red-400">{scanMutation.error.message}</p>
          ) : (
            <Button
              onClick={handleClaim}
              disabled={scanMutation.isPending || !astronaut.active}
              className="w-full"
            >
              {scanMutation.isPending
                ? "Scanning..."
                : astronaut.active
                  ? "Claim this astronaut"
                  : "Astronaut is inactive"}
            </Button>
          )}
        </Card>
      ) : (
        <Card className="p-4 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign in to claim this astronaut.
          </p>
          <Link href={`/login?next=/astronaut/${code}` as Route}>
            <Button variant="outline">Sign in</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
