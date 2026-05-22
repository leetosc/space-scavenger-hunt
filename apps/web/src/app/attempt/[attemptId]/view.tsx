"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { FileUpload } from "@space-scavenger-hunt/ui/components/ui/file-upload";
import { env } from "@space-scavenger-hunt/env/web";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import {
  Radio,
  ScanLine,
  Satellite,
  BrainCircuit,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Lock,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { MissionCountdown } from "@/components/mission-countdown";
import {
  fadeInUp,
  scaleIn,
  popIn,
  float,
  bounceTransition,
  springTransition,
} from "@/lib/animations";
import { trpc } from "@/utils/trpc";

const STATUS_COPY: Record<
  string,
  { label: string; tone: "info" | "warn" | "success" | "error" }
> = {
  PENDING_PHOTO: { label: "Awaiting photo", tone: "info" },
  SUBMITTED: { label: "Judging", tone: "info" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "error" },
  EXPIRED: { label: "Expired", tone: "warn" },
};

const STATUS_BADGE_STYLES: Record<
  "info" | "warn" | "success" | "error",
  {
    border: string;
    bg: string;
    text: string;
    glow: string;
    pulse: boolean;
  }
> = {
  success: {
    border: "border-emerald-500/35",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    glow: "shadow-[0_0_14px_rgba(16,185,129,0.25)]",
    pulse: true,
  },
  error: {
    border: "border-red-500/35",
    bg: "bg-red-500/10",
    text: "text-red-400",
    glow: "shadow-[0_0_14px_rgba(239,68,68,0.25)]",
    pulse: true,
  },
  warn: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    glow: "shadow-[0_0_10px_rgba(245,158,11,0.15)]",
    pulse: false,
  },
  info: {
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    glow: "shadow-[0_0_10px_rgba(34,211,238,0.15)]",
    pulse: false,
  },
};

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/* ---------- Scanning / loading messages ---------- */
const LOADING_MESSAGES = [
  "Decrypting sector coordinates...",
  "Establishing satellite uplink...",
  "Triangulating astronaut signal...",
  "Decoding rescue telemetry...",
  "Synchronizing orbital data...",
];

const JUDGING_MESSAGES = [
  "Scanning photo evidence...",
  "Analyzing visual telemetry...",
  "Cross-referencing rescue database...",
  "Verifying crew identification...",
  "Running pattern recognition...",
  "Checking authorization codes...",
];

const TASK_REGEN_MESSAGES = [
  "Raiding the cosmic challenge vault...",
  "Shuffling rescue protocols...",
  "Retuning the astronaut mission matrix...",
  "Spinning up a fresh objective...",
  "Recalibrating adventure telemetry...",
];

function useRotatingMessage(messages: string[], intervalMs = 2400) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [messages, intervalMs]);
  return messages[index]!;
}

/* ========================================================================= */
/*  InitialLoader - shown while challenge data is being fetched              */
/* ========================================================================= */
function InitialLoader() {
  const message = useRotatingMessage(LOADING_MESSAGES);

  return (
    <div className="mx-auto max-w-md px-6 py-20 flex flex-col items-center gap-6">
      {/* orbiting satellite */}
      <motion.div
        className="relative h-24 w-24"
        variants={float}
        animate="animate"
      >
        {/* outer ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-cyan-500/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        {/* inner ring */}
        <motion.div
          className="absolute inset-3 rounded-full border border-dashed border-indigo-400/30"
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
        {/* satellite dot on orbit */}
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "50% calc(50% + 48px)" }}
        >
          <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.7)]" />
        </motion.div>
        {/* center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Satellite className="size-8 text-cyan-400" />
          </motion.div>
        </div>
      </motion.div>

      {/* scan line */}
      <div className="w-48 h-0.5 bg-slate-800 rounded overflow-hidden relative">
        <motion.div
          className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
          animate={{ x: ["-48px", "192px"] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* rotating message */}
      <AnimatePresence mode="wait">
        <motion.p
          key={message}
          className="text-sm font-mono tracking-wider text-cyan-400/80 text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
        >
          {message}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/* ========================================================================= */
/*  JudgingOverlay - shown when status is SUBMITTED (AI analyzing)           */
/* ========================================================================= */
function JudgingOverlay() {
  const message = useRotatingMessage(JUDGING_MESSAGES, 2000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={springTransition}
    >
      <Card className="p-5 border-indigo-500/20 bg-indigo-950/20 overflow-hidden relative">
        <motion.div
          className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent"
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="flex items-start gap-4">
          {/* animated brain icon */}
          <div className="relative shrink-0">
            <motion.div
              className="h-12 w-12 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center"
              animate={{
                borderColor: [
                  "rgba(99, 102, 241, 0.2)",
                  "rgba(99, 102, 241, 0.5)",
                  "rgba(99, 102, 241, 0.2)",
                ],
                boxShadow: [
                  "0 0 0 0 rgba(99, 102, 241, 0)",
                  "0 0 15px 2px rgba(99, 102, 241, 0.2)",
                  "0 0 0 0 rgba(99, 102, 241, 0)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <BrainCircuit className="size-6 text-indigo-400" />
              </motion.div>
            </motion.div>
            {/* tiny orbiting sparkle */}
            <motion.div
              className="absolute -top-1 -right-1"
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "50% calc(50% + 12px)" }}
            >
              <Sparkles className="size-3 text-amber-400" />
            </motion.div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-xs tracking-widest text-indigo-300 uppercase font-bold">
                Analysis In Progress
              </h3>
              {/* pulsing dots */}
              <div className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-1 w-1 rounded-full bg-indigo-400"
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={message}
                className="text-sm text-slate-400 font-mono"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
              >
                {message}
              </motion.p>
            </AnimatePresence>

            {/* fake progress steps */}
            <div className="flex items-center gap-2 pt-1">
              {[
                { icon: ScanLine, label: "Scan" },
                { icon: Radio, label: "Verify" },
                { icon: ShieldCheck, label: "Authorize" },
              ].map((step, i) => (
                <motion.div
                  key={step.label}
                  className="flex items-center gap-1 text-[10px] font-mono text-slate-500"
                  animate={{
                    color: [
                      "rgb(100, 116, 139)",
                      "rgb(129, 140, 248)",
                      "rgb(100, 116, 139)",
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.7,
                    ease: "easeInOut",
                  }}
                >
                  <step.icon className="size-3" />
                  {step.label}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/* ========================================================================= */
/*  UploadingOverlay - shown during photo upload                             */
/* ========================================================================= */
function UploadingOverlay() {
  return (
    <motion.div
      className="flex flex-col items-center gap-3 py-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="relative h-12 w-12">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-t-cyan-400 border-r-cyan-400/40 border-b-cyan-400/10 border-l-cyan-400/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Satellite className="size-5 text-cyan-400" />
          </motion.div>
        </div>
      </div>
      <motion.p
        className="text-sm font-mono tracking-wider text-cyan-400/80"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Transmitting to orbital station...
      </motion.p>
    </motion.div>
  );
}

function TaskRegeneratingOverlay() {
  const message = useRotatingMessage(TASK_REGEN_MESSAGES, 1450);

  return (
    <motion.div
      className="relative w-full min-h-[7rem] overflow-hidden rounded-xl border border-cyan-500/20 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_45%),linear-gradient(135deg,rgba(8,47,73,0.9),rgba(15,23,42,0.95))] px-4 py-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={springTransition}
    >
      <motion.div
        className="pointer-events-none absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent"
        animate={{ top: ["8%", "86%", "8%"] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-cyan-400/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border border-dashed border-fuchsia-300/40"
            animate={{ rotate: -360 }}
            transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ scale: [1, 1.08, 1], rotate: [0, 8, -8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="size-7 text-cyan-300" />
          </motion.div>
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
            animate={{ rotate: 360 }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "50% calc(50% + 28px)" }}
          >
            <div className="h-2.5 w-2.5 rounded-full bg-fuchsia-300 shadow-[0_0_16px_rgba(244,114,182,0.7)]" />
          </motion.div>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
              New Task Incoming
            </h3>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-cyan-300"
                  animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                  transition={{
                    duration: 0.9,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={message}
              className="text-sm font-mono text-cyan-50/90"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.22 }}
            >
              {message}
            </motion.p>
          </AnimatePresence>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono uppercase tracking-wide text-cyan-200/70">
            {["Brainstorm", "Remix", "Deploy"].map((step, index) => (
              <motion.span
                key={step}
                animate={{
                  opacity: [0.35, 1, 0.35],
                  color: [
                    "rgb(165 243 252 / 0.7)",
                    "rgb(255 255 255 / 0.95)",
                    "rgb(165 243 252 / 0.7)",
                  ],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: index * 0.3,
                  ease: "easeInOut",
                }}
              >
                {step}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ========================================================================= */
/*  MissionStatusBadge - space-themed attempt status under the name          */
/* ========================================================================= */
function MissionStatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "info" | "warn" | "success" | "error";
}) {
  const style = STATUS_BADGE_STYLES[tone];

  return (
    <motion.span
      className={`inline-flex mt-2 rounded-md border px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-widest ${style.border} ${style.bg} ${style.text} ${style.glow}`}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{
        opacity: 1,
        scale: 1,
        ...(style.pulse
          ? {
              boxShadow: [
                style.glow,
                tone === "success"
                  ? "0 0 18px rgba(16, 185, 129, 0.35)"
                  : "0 0 18px rgba(239, 68, 68, 0.35)",
                style.glow,
              ],
            }
          : {}),
      }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={
        style.pulse
          ? { ...bounceTransition, boxShadow: { duration: 2, repeat: Infinity } }
          : bounceTransition
      }
    >
      {label}
    </motion.span>
  );
}

/* ========================================================================= */
/*  AiVerdictCard - space-themed AI judgement result                         */
/* ========================================================================= */
function getAiVerdict(
  status: string,
  aiPassed: boolean | null | undefined,
): boolean | null {
  if (status === "APPROVED") return true;
  if (status === "REJECTED") return false;
  if (aiPassed === true) return true;
  if (aiPassed === false) return false;
  return null;
}

function AiVerdictCard({
  approved,
  feedback,
}: {
  approved: boolean;
  feedback: string;
}) {
  const theme = approved
    ? {
        border: "border-emerald-500/25",
        bg: "bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_48%),linear-gradient(135deg,rgba(6,30,24,0.95),rgba(15,23,42,0.98))]",
        header: "text-emerald-300",
        verdict: "Approved",
        verdictClass: "text-emerald-400",
        glowOff: "rgba(16, 185, 129, 0)",
        glowOn: "rgba(16, 185, 129, 0.35)",
        icon: ShieldCheck,
        iconBox: "border-emerald-500/25 bg-emerald-500/10",
        iconColor: "text-emerald-400",
      }
    : {
        border: "border-red-500/25",
        bg: "bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.14),_transparent_48%),linear-gradient(135deg,rgba(36,12,18,0.95),rgba(15,23,42,0.98))]",
        header: "text-red-300",
        verdict: "Rejected",
        verdictClass: "text-red-400",
        glowOff: "rgba(239, 68, 68, 0)",
        glowOn: "rgba(239, 68, 68, 0.35)",
        icon: XCircle,
        iconBox: "border-red-500/25 bg-red-500/10",
        iconColor: "text-red-400",
      };

  const Icon = theme.icon;

  return (
    <Card className={`p-5 gap-3 ${theme.border} ${theme.bg}`}>
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <motion.div
            className={`h-12 w-12 rounded-lg border flex items-center justify-center ${theme.iconBox}`}
            animate={{
              boxShadow: [
                `0 0 0 0 ${theme.glowOff}`,
                `0 0 18px 2px ${theme.glowOn}`,
                `0 0 0 0 ${theme.glowOff}`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Icon className={`size-6 ${theme.iconColor}`} />
          </motion.div>
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          <p
            className={`font-mono text-xs tracking-widest uppercase font-bold ${theme.header}`}
          >
            Mission Verdict
          </p>

          <motion.p
            className={`text-2xl font-bold tracking-tight ${theme.verdictClass}`}
            animate={{
              textShadow: [
                `0 0 0px ${theme.glowOff}`,
                `0 0 16px ${theme.glowOn}`,
                `0 0 0px ${theme.glowOff}`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {theme.verdict}
          </motion.p>

          <p className="text-sm text-slate-300/90 leading-relaxed">{feedback}</p>
        </div>
      </div>
    </Card>
  );
}

/* ========================================================================= */
/*  Main component                                                           */
/* ========================================================================= */
export default function AttemptView({ attemptId }: { attemptId: string }) {
  const queryClient = useQueryClient();
  const attemptQuery = useQuery({
    ...trpc.attempt.getById.queryOptions({ id: attemptId }),
    refetchInterval: (query) => {
      const status = query.state.data?.attempt.status;
      if (status === "SUBMITTED" || status === "PENDING_PHOTO") return 3000;
      return false;
    },
  });
  const activity = useQuery({
    ...trpc.activity.getState.queryOptions(),
    refetchInterval: 5000,
  });
  const regenerateTaskMutation = useMutation({
    ...trpc.attempt.regenerateTask.mutationOptions(),
    onSuccess: async () => {
      clearPendingPhoto();
      await queryClient.invalidateQueries({
        queryKey: trpc.attempt.getById.queryKey({ id: attemptId }),
      });
      await queryClient.invalidateQueries({
        queryKey: trpc.attempt.getForCurrentPlayer.queryKey(),
      });
      toast.success("Task regenerated");
    },
  });

  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const celebratedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  if (!attemptQuery.data) {
    return <InitialLoader />;
  }

  const { attempt, previewUrl, canEdit } = attemptQuery.data;
  const status = STATUS_COPY[attempt.status] ?? STATUS_COPY.PENDING_PHOTO!;

  // Fire confetti on approval (once)
  if (canEdit && attempt.status === "APPROVED" && !celebratedRef.current) {
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
    if (uploading || !canEdit) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error("Only JPG, PNG, or WebP photos are allowed.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Photo must be 8MB or smaller.");
      return;
    }

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
      toast.success("Photo uploaded - judging...");
      clearPendingPhoto();
      queryClient.invalidateQueries({
        queryKey: trpc.attempt.getById.queryKey({ id: attemptId }),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  const showUploadCard =
    attempt.status === "PENDING_PHOTO" || attempt.status === "REJECTED";
  const canRegenerateTask =
    canEdit &&
    !uploading &&
    (attempt.status === "PENDING_PHOTO" || attempt.status === "REJECTED");
  const aiVerdict = getAiVerdict(attempt.status, attempt.aiPassed);

  function clearPendingPhoto() {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(null);
    setPendingFile(null);
  }

  function handleFileSelect(files: File[]) {
    if (!canEdit) return;
    const file = files[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error("Only JPG, PNG, or WebP photos are allowed.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Photo must be 8MB or smaller.");
      return;
    }
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setPendingFile(file);
    setLocalPreviewUrl(URL.createObjectURL(file));
  }

  function handleConfirmUpload() {
    if (pendingFile) handleUpload(pendingFile);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <MissionCountdown
        status={activity.data?.status}
        deadlineAt={activity.data?.deadlineAt}
        serverNow={activity.data?.serverNow}
        className="w-full justify-center"
      />

      <header>
        {!canEdit ? (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">
            <Lock className="size-3.5" />
            Read only
          </div>
        ) : null}
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-200/50">
          Challenge
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{attempt.astronaut.name}</h1>
        <AnimatePresence mode="wait">
          <MissionStatusBadge
            key={attempt.status}
            label={status.label}
            tone={status.tone}
          />
        </AnimatePresence>
        {!canEdit ? (
          <p className="mt-3 text-sm text-amber-100/80">
            This attempt belongs to {attempt.team?.name ?? "another team"}. You can view the
            mission details, but only that team can change the task or submit a photo.
          </p>
        ) : null}
      </header>

      <Card className="p-5 gap-4 border-cyan-500/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_48%),linear-gradient(135deg,rgba(8,47,73,0.85),rgba(15,23,42,0.98))]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cyan-500/25 bg-cyan-500/10">
              <Satellite className="size-4 text-cyan-400" />
            </div>
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
              Mission Brief
            </h2>
          </div>
          {canRegenerateTask ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-cyan-500/30 bg-slate-950/40 font-mono text-[11px] uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/10 hover:text-cyan-100"
              onClick={() => regenerateTaskMutation.mutate({ attemptId })}
              disabled={regenerateTaskMutation.isPending}
            >
              <RefreshCw
                className={`mr-2 size-4 ${regenerateTaskMutation.isPending ? "animate-spin" : ""}`}
              />
              Get new task
            </Button>
          ) : null}
        </div>

        <div className="relative w-full min-h-[7rem]">
          <AnimatePresence mode="wait" initial={false}>
            {regenerateTaskMutation.isPending ? (
              <TaskRegeneratingOverlay key="regenerating-task" />
            ) : (
              <motion.div
                key={attempt.taskPrompt}
                className="rounded-lg border border-cyan-500/10 bg-slate-950/30 px-4 py-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <p className="w-full text-sm leading-relaxed text-cyan-50/90">
                  {attempt.taskPrompt}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      <AnimatePresence>
        {previewUrl ? (
          <motion.div
            key="preview"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Card className="p-2 relative overflow-hidden">
              <motion.div
                className="relative aspect-[4/3] w-full overflow-hidden rounded bg-muted/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <Image
                  src={previewUrl}
                  alt="Submitted photo"
                  fill
                  sizes="(min-width: 768px) 672px, calc(100vw - 48px)"
                  className="object-contain"
                  referrerPolicy="no-referrer"
                  priority
                />
              </motion.div>
              {attempt.status === "SUBMITTED" && !attempt.aiFeedback ? (
                <motion.div
                  className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none"
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ) : null}
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* AI judging state */}
      <AnimatePresence>
        {attempt.status === "SUBMITTED" && !attempt.aiFeedback ? (
          <JudgingOverlay key="judging" />
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
            {aiVerdict !== null ? (
              <AiVerdictCard approved={aiVerdict} feedback={attempt.aiFeedback} />
            ) : (
              <Card className="p-5 gap-2 border-indigo-500/20 bg-indigo-950/20">
                <p className="font-mono text-xs tracking-widest text-indigo-300 uppercase font-bold">
                  Mission Control
                </p>
                <p className="text-sm text-slate-300/90">{attempt.aiFeedback}</p>
              </Card>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showUploadCard ? (
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
                Capture a single photo that satisfies the task. JPG/PNG/WebP, up
                to 8MB.
              </p>
              {!canEdit ? (
                <div className="inline-flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
                  <Lock className="size-3.5 shrink-0" />
                  Submission is locked because this is not your team&apos;s attempt.
                </div>
              ) : null}

              {uploading ? (
                <UploadingOverlay />
              ) : localPreviewUrl && pendingFile ? (
                <div className="space-y-3">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted/20">
                    <Image
                      src={localPreviewUrl}
                      alt="Photo preview"
                      fill
                      sizes="(min-width: 768px) 672px, calc(100vw - 48px)"
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {pendingFile.name}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleConfirmUpload} disabled={uploading || !canEdit}>
                      Submit photo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={clearPendingPhoto}
                      disabled={uploading || !canEdit}
                    >
                      Choose another
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full min-h-80 rounded-lg border border-dashed border-cyan-500/20 bg-slate-950/50 overflow-hidden">
                  <FileUpload onChange={handleFileSelect} disabled={!canEdit} />
                </div>
              )}
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
                {canEdit
                  ? "Astronaut claimed for your team!"
                  : `Astronaut claimed by ${attempt.team?.name ?? "another team"}!`}
              </motion.p>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
