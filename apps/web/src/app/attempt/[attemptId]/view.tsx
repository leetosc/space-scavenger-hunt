"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { env } from "@space-scavenger-hunt/env/web";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  staggerContainer,
  fadeInUp,
  scaleIn,
  popIn,
  buttonInteraction,
  bounceTransition,
  springTransition,
} from "@/lib/animations";
import { trpc } from "@/utils/trpc";

const STATUS_COPY: Record<string, { label: string; tone: "info" | "warn" | "success" | "error" }> = {
  PENDING_PHOTO: { label: "Awaiting photo", tone: "info" },
  SUBMITTED: { label: "Submitted - judging", tone: "info" },
  APPROVED: { label: "Approved!", tone: "success" },
  REJECTED: { label: "Rejected", tone: "error" },
  EXPIRED: { label: "Expired", tone: "warn" },
};

const statusToneClasses = {
  success: "bg-green-500/15 text-green-700",
  error: "bg-red-500/15 text-red-700",
  warn: "bg-amber-500/15 text-amber-700",
  info: "bg-blue-500/15 text-blue-700",
};

export default function AttemptView({ attemptId }: { attemptId: string }) {
  const queryClient = useQueryClient();
  const attemptQuery = useQuery({
    ...trpc.attempt.getById.queryOptions({ id: attemptId }),
    refetchInterval: 3000,
  });

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const celebratedRef = useRef(false);

  if (!attemptQuery.data) {
    return (
      <motion.div
        className="p-10 text-center text-sm text-muted-foreground"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Loading challenge...
      </motion.div>
    );
  }

  const { attempt, previewUrl } = attemptQuery.data;
  const status = STATUS_COPY[attempt.status] ?? STATUS_COPY.PENDING_PHOTO!;

  // Fire confetti on approval (once)
  if (attempt.status === "APPROVED" && !celebratedRef.current) {
    celebratedRef.current = true;
    setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#22c55e", "#06b6d4", "#a855f7", "#f59e0b"],
      });
    }, 300);
  }

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
    <motion.div
      className="mx-auto max-w-2xl px-6 py-10 space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.header variants={fadeInUp}>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Challenge</p>
        <motion.h1
          className="text-3xl font-bold"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
        >
          {attempt.astronaut.name}
        </motion.h1>
        <AnimatePresence mode="wait">
          <motion.span
            key={attempt.status}
            className={`inline-block mt-2 rounded px-2 py-0.5 text-xs font-medium ${statusToneClasses[status.tone]}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={bounceTransition}
          >
            {status.label}
          </motion.span>
        </AnimatePresence>
      </motion.header>

      <motion.div variants={fadeInUp}>
        <Card className="p-4 gap-2">
          <h2 className="font-bold">Your task</h2>
          <p className="text-sm">{attempt.taskPrompt}</p>
        </Card>
      </motion.div>

      <AnimatePresence>
        {previewUrl ? (
          <motion.div
            key="preview"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Card className="p-2">
              <motion.img
                src={previewUrl}
                alt="Submitted photo"
                className="w-full rounded"
                referrerPolicy="no-referrer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              />
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {attempt.aiFeedback ? (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={springTransition}
          >
            <Card className="p-4 gap-1">
              <h2 className="font-bold">AI feedback</h2>
              <p className="text-sm">{attempt.aiFeedback}</p>
              {typeof attempt.aiConfidence === "number" ? (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Confidence: {Math.round(attempt.aiConfidence * 100)}%
                  </p>
                  <div className="h-1.5 w-full rounded bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full rounded ${
                        attempt.aiConfidence > 0.7 ? "bg-green-500" : attempt.aiConfidence > 0.4 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(attempt.aiConfidence * 100)}%` }}
                      transition={{ ...springTransition, delay: 0.2 }}
                    />
                  </div>
                </div>
              ) : null}
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {canUpload ? (
          <motion.div
            key="upload"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -10 }}
          >
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
              <motion.div {...buttonInteraction}>
                <Button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? "Uploading..." : "Choose photo"}
                </Button>
              </motion.div>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {attempt.status === "APPROVED" ? (
          <motion.div
            key="approved"
            variants={popIn}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <Card className="p-4 text-center border-green-500/30 bg-green-500/5">
              <motion.p
                className="text-lg font-bold text-green-500"
                animate={{
                  textShadow: [
                    "0 0 0px rgba(34, 197, 94, 0)",
                    "0 0 20px rgba(34, 197, 94, 0.5)",
                    "0 0 0px rgba(34, 197, 94, 0)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Astronaut claimed for your team!
              </motion.p>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
