"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { env } from "@space-scavenger-hunt/env/web";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

const STATUS_COPY: Record<string, { label: string; tone: "info" | "warn" | "success" | "error" }> = {
  PENDING_PHOTO: { label: "Awaiting photo", tone: "info" },
  SUBMITTED: { label: "Submitted - judging", tone: "info" },
  APPROVED: { label: "Approved!", tone: "success" },
  REJECTED: { label: "Rejected", tone: "error" },
  EXPIRED: { label: "Expired", tone: "warn" },
};

export default function AttemptView({ attemptId }: { attemptId: string }) {
  const queryClient = useQueryClient();
  const attemptQuery = useQuery({
    ...trpc.attempt.getById.queryOptions({ id: attemptId }),
    refetchInterval: 3000,
  });

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!attemptQuery.data) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Loading challenge...</div>;
  }

  const { attempt, previewUrl } = attemptQuery.data;
  const status = STATUS_COPY[attempt.status] ?? STATUS_COPY.PENDING_PHOTO!;

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(
        `${env.NEXT_PUBLIC_SERVER_URL}/api/attempts/${attemptId}/upload`,
        {
          method: "POST",
          body: form,
          credentials: "include",
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Upload failed (${res.status})`);
      }
      toast.success("Photo uploaded - AI is judging now.");
      queryClient.invalidateQueries({ queryKey: trpc.attempt.getById.queryKey({ id: attemptId }) });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  const canUpload = attempt.status === "PENDING_PHOTO" || attempt.status === "REJECTED";

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Challenge</p>
        <h1 className="text-3xl font-bold">{attempt.astronaut.name}</h1>
        <span
          className={`inline-block mt-2 rounded px-2 py-0.5 text-xs font-medium ${
            status.tone === "success"
              ? "bg-green-500/15 text-green-700"
              : status.tone === "error"
                ? "bg-red-500/15 text-red-700"
                : status.tone === "warn"
                  ? "bg-amber-500/15 text-amber-700"
                  : "bg-blue-500/15 text-blue-700"
          }`}
        >
          {status.label}
        </span>
      </header>

      <Card className="p-4 gap-2">
        <h2 className="font-bold">Your task</h2>
        <p className="text-sm">{attempt.taskPrompt}</p>
      </Card>

      {previewUrl ? (
        <Card className="p-2">
          <img
            src={previewUrl}
            alt="Submitted photo"
            className="w-full rounded"
            referrerPolicy="no-referrer"
          />
        </Card>
      ) : null}

      {attempt.aiFeedback ? (
        <Card className="p-4 gap-1">
          <h2 className="font-bold">AI feedback</h2>
          <p className="text-sm">{attempt.aiFeedback}</p>
          {typeof attempt.aiConfidence === "number" ? (
            <p className="text-xs text-muted-foreground">
              Confidence: {Math.round(attempt.aiConfidence * 100)}%
            </p>
          ) : null}
        </Card>
      ) : null}

      {canUpload ? (
        <Card className="p-4 gap-3">
          <h2 className="font-bold">Submit a photo</h2>
          <p className="text-sm text-muted-foreground">
            Capture a single photo that satisfies the task. JPG/PNG/WebP, up to 8MB.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
          <Button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Uploading..." : "Choose photo"}
          </Button>
        </Card>
      ) : null}

      {attempt.status === "APPROVED" ? (
        <Card className="p-4 text-center">
          <p className="text-lg font-bold text-green-700">Astronaut claimed for your team!</p>
        </Card>
      ) : null}
    </div>
  );
}
