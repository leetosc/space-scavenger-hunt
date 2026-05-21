"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { Label } from "@space-scavenger-hunt/ui/components/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

import {
  staggerContainer,
  fadeInUp,
  scaleIn,
  buttonInteraction,
  springTransition,
} from "@/lib/animations";
import { trpc } from "@/utils/trpc";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "PENDING_PHOTO", label: "Pending" },
  { id: "SUBMITTED", label: "Submitted" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
  { id: "EXPIRED", label: "Expired" },
] as const;

const ATTEMPT_STATUSES = [
  "PENDING_PHOTO",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
] as const;

export default function AdminAttemptsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]["id"]>("SUBMITTED");
  const [statusDrafts, setStatusDrafts] = useState<
    Record<string, (typeof ATTEMPT_STATUSES)[number]>
  >({});

  const attemptsQuery = useQuery({
    ...trpc.attempt.adminList.queryOptions(
      filter === "all" ? undefined : { status: filter },
    ),
    refetchInterval: 5000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: trpc.attempt.adminList.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.leaderboard.getCurrent.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.leaderboard.getFinal.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.activity.validateSetup.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.team.getDashboard.queryKey() });
  };

  const approveMutation = useMutation({
    ...trpc.attempt.adminApprove.mutationOptions(),
    onSuccess: () => {
      toast.success("Approved");
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    ...trpc.attempt.adminReject.mutationOptions(),
    onSuccess: () => {
      toast.success("Rejected");
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const setStatusMutation = useMutation({
    ...trpc.attempt.adminSetStatus.mutationOptions(),
    onSuccess: () => {
      toast.success("Attempt status updated");
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <motion.div
      className="space-y-6 max-w-4xl"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.header className="space-y-3" variants={fadeInUp}>
        <div>
          <h1 className="text-2xl font-bold">Attempt review</h1>
          <p className="text-sm text-muted-foreground">
            Approve good photos and reject bad ones. Approval is transactional and creates the team
            claim.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((f) => (
            <motion.div
              key={f.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="sm"
                variant={filter === f.id ? "default" : "outline"}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </Button>
            </motion.div>
          ))}
        </div>
      </motion.header>

      {!attemptsQuery.data ? (
        <motion.p
          className="text-sm text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Loading...
        </motion.p>
      ) : attemptsQuery.data.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <Card className="p-6 text-center text-sm text-muted-foreground">No attempts match.</Card>
        </motion.div>
      ) : (
        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence>
            {attemptsQuery.data.map((a) => {
              const draftStatus =
                statusDrafts[a.id] ?? (a.status as (typeof ATTEMPT_STATUSES)[number]);

              return (
                <motion.div
                  key={a.id}
                  variants={fadeInUp}
                  exit={{ opacity: 0, y: -10 }}
                  layout
                >
                  <Card className="p-4 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
                    <div>
                      {a.previewUrl ? (
                        <motion.img
                          src={a.previewUrl}
                          alt="Submission"
                          className="w-full rounded border"
                          referrerPolicy="no-referrer"
                          variants={scaleIn}
                          initial="hidden"
                          animate="visible"
                        />
                      ) : (
                        <div className="aspect-square rounded border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
                          No photo
                        </div>
                      )}
                    </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold">{a.astronaut.name}</h2>
                      <span className="text-xs rounded px-2 py-0.5 bg-muted">{a.status}</span>
                      <span className="text-xs rounded px-2 py-0.5 bg-blue-500/15 text-blue-700">
                        {a.team.name}
                      </span>
                      {a.claim ? (
                        <motion.span
                          className="text-xs rounded px-2 py-0.5 bg-green-500/15 text-green-700"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          claimed
                        </motion.span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Scanned by {a.scannedByPlayer.name} ·{" "}
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm">
                      <strong>Task:</strong> {a.taskPrompt}
                    </p>
                    {typeof a.aiPassed === "boolean" ? (
                      <p className="text-sm">
                        <strong>AI:</strong> {a.aiPassed ? "passed" : "failed"}
                        {typeof a.aiConfidence === "number"
                          ? ` (${Math.round(a.aiConfidence * 100)}%)`
                          : null}
                        {a.aiFeedback ? ` - ${a.aiFeedback}` : null}
                      </p>
                    ) : a.aiFeedback ? (
                      <p className="text-sm">
                        <strong>AI:</strong> {a.aiFeedback}
                      </p>
                    ) : null}

                    <div className="pt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="min-w-[180px]">
                        <Label htmlFor={`attempt-status-${a.id}`} className="mb-1.5 block">
                          Testing status
                        </Label>
                        <select
                          id={`attempt-status-${a.id}`}
                          value={draftStatus}
                          onChange={(event) =>
                            setStatusDrafts((current) => ({
                              ...current,
                              [a.id]: event.target.value as (typeof ATTEMPT_STATUSES)[number],
                            }))
                          }
                          className="flex h-8 w-full items-center border border-input bg-transparent px-2.5 py-1.5 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring/50 dark:bg-input/30"
                        >
                          {ATTEMPT_STATUSES.map((attemptStatus) => (
                            <option key={attemptStatus} value={attemptStatus}>
                              {attemptStatus}
                            </option>
                          ))}
                        </select>
                      </div>
                      <motion.div {...buttonInteraction}>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={
                            setStatusMutation.isPending ||
                            draftStatus === a.status
                          }
                          onClick={() => {
                            const feedback =
                              draftStatus === "REJECTED"
                                ? prompt("Reason (optional)") ?? "Manually rejected by admin."
                                : undefined;
                            setStatusMutation.mutate({
                              attemptId: a.id,
                              status: draftStatus,
                              ...(feedback ? { feedback } : {}),
                            });
                          }}
                        >
                          Set status
                        </Button>
                      </motion.div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <motion.div {...buttonInteraction}>
                        <Button
                          size="sm"
                          disabled={a.status === "APPROVED" || approveMutation.isPending}
                          onClick={() => approveMutation.mutate({ attemptId: a.id })}
                        >
                          Approve
                        </Button>
                      </motion.div>
                      <motion.div {...buttonInteraction}>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={a.status === "REJECTED" || rejectMutation.isPending}
                          onClick={() => {
                            const feedback =
                              prompt("Reason (optional)") ?? "Manually rejected by admin.";
                            rejectMutation.mutate({ attemptId: a.id, feedback });
                          }}
                        >
                          Reject
                        </Button>
                      </motion.div>
                    </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
