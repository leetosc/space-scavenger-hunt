"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Badge } from "@space-scavenger-hunt/ui/components/badge";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@space-scavenger-hunt/ui/components/dialog";
import { Label } from "@space-scavenger-hunt/ui/components/label";
import { Textarea } from "@space-scavenger-hunt/ui/components/textarea";
import { cn } from "@space-scavenger-hunt/ui/lib/utils";
import type { AppRouter } from "@space-scavenger-hunt/api/routers/index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  staggerContainer,
  fadeInUp,
  buttonInteraction,
} from "@/lib/animations";
import { IMAGE_BLUR_DATA_URL } from "@/lib/image-placeholder";
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

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Attempt = RouterOutputs["attempt"]["adminList"][number];
type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];
type StatusFilterId = (typeof STATUS_FILTERS)[number]["id"];
type RejectTarget =
  | { type: "reject"; attemptId: string; astronautName: string }
  | { type: "setStatus"; attemptId: string; astronautName: string; status: AttemptStatus };
type RejectTargetInput = { type: "reject" } | { type: "setStatus"; status: AttemptStatus };

function formatStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

function statusBadgeClass(status: string) {
  if (status === "APPROVED") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }
  if (status === "REJECTED") {
    return "border-rose-500/40 bg-rose-500/10 text-rose-300";
  }
  if (status === "SUBMITTED") {
    return "border-cyan-500/40 bg-cyan-500/10 text-cyan-300";
  }
  if (status === "EXPIRED") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  }
  return "border-slate-500/40 bg-slate-500/10 text-slate-300";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("h-5 rounded-sm px-1.5 capitalize", statusBadgeClass(status))}
    >
      {formatStatus(status)}
    </Badge>
  );
}

function AttemptToolbar({
  filter,
  attemptsCount,
  selectedCount,
  allSelected,
  someSelected,
  deletePending,
  onFilterChange,
  onSelectAll,
  onDeleteSelected,
}: {
  filter: StatusFilterId;
  attemptsCount: number;
  selectedCount: number;
  allSelected: boolean;
  someSelected: boolean;
  deletePending: boolean;
  onFilterChange: (filter: StatusFilterId) => void;
  onSelectAll: (checked: boolean) => void;
  onDeleteSelected: () => void;
}) {
  return (
    <motion.div
      className="sticky top-0 z-20 -mx-1 rounded border border-border/70 bg-background/90 px-3 py-2 shadow-sm backdrop-blur"
      variants={fadeInUp}
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={filter === f.id ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => onFilterChange(f.id)}
            >
              {f.label}
            </Button>
          ))}
          <span className="ml-1 text-xs text-muted-foreground">
            {attemptsCount} visible
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-7 items-center gap-2 rounded border border-border/70 bg-muted/20 px-2.5 text-xs">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) {
                  input.indeterminate = someSelected && !allSelected;
                }
              }}
              onChange={(event) => onSelectAll(event.target.checked)}
              className="accent-cyan-400"
            />
            Select all
          </label>
          {selectedCount > 0 ? (
            <motion.div {...buttonInteraction}>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-7 px-2.5 text-xs"
                disabled={deletePending}
                onClick={onDeleteSelected}
              >
                <Trash2 className="size-3.5" />
                Delete selected ({selectedCount})
              </Button>
            </motion.div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function getAiText(attempt: Attempt) {
  return typeof attempt.aiPassed === "boolean"
    ? `${attempt.aiPassed ? "passed" : "failed"}${
        typeof attempt.aiConfidence === "number"
          ? ` (${Math.round(attempt.aiConfidence * 100)}%)`
          : ""
      }${attempt.aiFeedback ? ` - ${attempt.aiFeedback}` : ""}`
    : attempt.aiFeedback;
}

function AttemptPhoto({
  attempt,
  className,
  sizes = "112px",
}: {
  attempt: Attempt;
  className?: string;
  sizes?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded border border-border/70 bg-muted/20",
        className,
      )}
    >
      {attempt.previewUrl ? (
        <Image
          src={attempt.previewUrl}
          alt="Submission"
          fill
          sizes={sizes}
          className="object-cover"
          placeholder="blur"
          blurDataURL={IMAGE_BLUR_DATA_URL}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
          No photo
        </div>
      )}
    </div>
  );
}

function AttemptTags({ attempt }: { attempt: Attempt }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <StatusBadge status={attempt.status} />
      <Badge
        variant="outline"
        className="h-5 rounded-sm border-blue-500/30 bg-blue-500/10 px-1.5 text-blue-300"
      >
        {attempt.team.name}
      </Badge>
      {attempt.claim ? (
        <Badge
          variant="outline"
          className="h-5 rounded-sm border-emerald-500/30 bg-emerald-500/10 px-1.5 text-emerald-300"
        >
          claimed
        </Badge>
      ) : null}
    </div>
  );
}

function AttemptTile({
  attempt,
  selected,
  onSelectedChange,
  onOpen,
}: {
  attempt: Attempt;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  onOpen: () => void;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      className="group cursor-pointer overflow-hidden p-0 transition-colors hover:border-cyan-400/50 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="relative">
        <AttemptPhoto
          attempt={attempt}
          className="rounded-b-none border-0 border-b"
          sizes="(min-width: 1280px) 280px, (min-width: 768px) 33vw, 100vw"
        />
        <label
          className="absolute left-2 top-2 flex size-7 items-center justify-center rounded border border-border/70 bg-background/85 backdrop-blur"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <span className="sr-only">Select attempt for {attempt.astronaut.name}</span>
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelectedChange(event.target.checked)}
            className="accent-cyan-400"
          />
        </label>
      </div>

      <div className="space-y-2 p-3">
        <div className="min-w-0 space-y-1.5">
          <h2 className="truncate text-sm font-bold">{attempt.astronaut.name}</h2>
          <AttemptTags attempt={attempt} />
        </div>
        <p className="line-clamp-3 min-h-[3.75rem] text-xs leading-snug text-muted-foreground">
          {attempt.taskPrompt}
        </p>
      </div>
    </Card>
  );
}

function AttemptReviewDialog({
  attempt,
  draftStatus,
  approvePending,
  rejectPending,
  setStatusPending,
  deletePending,
  onDraftStatusChange,
  onSetStatus,
  onApprove,
  onReject,
  onDelete,
  onOpenChange,
}: {
  attempt: Attempt | null;
  draftStatus: AttemptStatus;
  approvePending: boolean;
  rejectPending: boolean;
  setStatusPending: boolean;
  deletePending: boolean;
  onDraftStatusChange: (status: AttemptStatus) => void;
  onSetStatus: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const aiText = attempt ? getAiText(attempt) : undefined;

  return (
    <Dialog open={attempt !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {attempt ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                <span>{attempt.astronaut.name}</span>
                <AttemptTags attempt={attempt} />
              </DialogTitle>
              <DialogDescription>
                Scanned by {attempt.scannedByPlayer.name} ·{" "}
                {new Date(attempt.createdAt).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
              <AttemptPhoto
                attempt={attempt}
                className="mx-auto max-w-80"
                sizes="(min-width: 768px) 320px, 100vw"
              />

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Task
                  </h3>
                  <p className="text-sm leading-relaxed">{attempt.taskPrompt}</p>
                </div>

                {aiText ? (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      AI review
                    </h3>
                    <p className="text-sm leading-relaxed">{aiText}</p>
                  </div>
                ) : null}

                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                  <div className="min-w-0">
                    <Label htmlFor={`attempt-status-${attempt.id}`} className="mb-1 block text-xs">
                      Manual status
                    </Label>
                    <select
                      id={`attempt-status-${attempt.id}`}
                      value={draftStatus}
                      onChange={(event) =>
                        onDraftStatusChange(event.target.value as AttemptStatus)
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
                      className="h-8 px-2.5 text-xs"
                      disabled={setStatusPending || draftStatus === attempt.status}
                      onClick={onSetStatus}
                    >
                      Set
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <motion.div {...buttonInteraction}>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deletePending}
                  onClick={onDelete}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </motion.div>
              <div className="flex flex-wrap gap-2">
                <motion.div {...buttonInteraction}>
                  <Button
                    size="sm"
                    disabled={attempt.status === "APPROVED" || approvePending}
                    onClick={onApprove}
                  >
                    Approve
                  </Button>
                </motion.div>
                <motion.div {...buttonInteraction}>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={attempt.status === "REJECTED" || rejectPending}
                    onClick={onReject}
                  >
                    Reject
                  </Button>
                </motion.div>
              </div>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RejectAttemptDialog({
  target,
  pending,
  onCancel,
  onConfirm,
}: {
  target: RejectTarget | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (feedback: string) => void;
}) {
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (target) {
      setFeedback("");
    }
  }, [target]);

  const submit = () => {
    onConfirm(feedback.trim() || "Manually rejected by admin.");
  };

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open && !pending) {
          onCancel();
        }
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Reject attempt?</DialogTitle>
          <DialogDescription>
            {target
              ? `Send ${target.astronautName}'s attempt back with optional feedback.`
              : "Send this attempt back with optional feedback."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="reject-feedback">Feedback</Label>
          <Textarea
            id="reject-feedback"
            value={feedback}
            maxLength={500}
            rows={4}
            disabled={pending}
            placeholder="Manually rejected by admin."
            onChange={(event) => setFeedback(event.target.value)}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={submit}
          >
            {pending ? "Rejecting..." : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminAttemptsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilterId>("all");
  const [statusDrafts, setStatusDrafts] = useState<Record<string, AttemptStatus>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [reviewingAttemptId, setReviewingAttemptId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string[] | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);

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

  const deleteMutation = useMutation({
    ...trpc.attempt.adminDelete.mutationOptions(),
    onSuccess: (result) => {
      toast.success(
        result.deleted === 1 ? "Attempt deleted" : `${result.deleted} attempts deleted`,
      );
      setSelectedIds(new Set());
      setDeleteTarget(null);
      invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteCount = deleteTarget?.length ?? 0;

  const attempts = attemptsQuery.data ?? [];
  const attemptIds = useMemo(() => attempts.map((attempt) => attempt.id), [attempts]);
  const reviewingAttempt = reviewingAttemptId
    ? attempts.find((attempt) => attempt.id === reviewingAttemptId) ?? null
    : null;
  const reviewingDraftStatus = reviewingAttempt
    ? statusDrafts[reviewingAttempt.id] ?? (reviewingAttempt.status as AttemptStatus)
    : ATTEMPT_STATUSES[0];
  const allSelected =
    attemptIds.length > 0 && attemptIds.every((id) => selectedIds.has(id));
  const someSelected = attemptIds.some((id) => selectedIds.has(id));

  useEffect(() => {
    setSelectedIds((current) => {
      const visible = new Set(attemptIds);
      const next = new Set([...current].filter((id) => visible.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [attemptIds]);

  useEffect(() => {
    if (reviewingAttemptId && !attemptIds.includes(reviewingAttemptId)) {
      setReviewingAttemptId(null);
    }
  }, [attemptIds, reviewingAttemptId]);

  const toggleSelected = (attemptId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(attemptId);
      } else {
        next.delete(attemptId);
      }
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(attemptIds) : new Set());
  };

  const openDeleteDialog = (attemptIdsToDelete: string[]) => {
    setDeleteTarget(attemptIdsToDelete);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget?.length) return;
    deleteMutation.mutate({ attemptIds: deleteTarget });
  };

  const openRejectDialog = (attempt: Attempt, target: RejectTargetInput) => {
    const attemptDetails = {
      attemptId: attempt.id,
      astronautName: attempt.astronaut.name,
    };

    setRejectTarget(
      target.type === "setStatus"
        ? { ...attemptDetails, type: "setStatus", status: target.status }
        : { ...attemptDetails, type: "reject" },
    );
  };

  const handleConfirmReject = (feedback: string) => {
    if (!rejectTarget) return;
    if (rejectTarget.type === "setStatus") {
      setStatusMutation.mutate(
        {
          attemptId: rejectTarget.attemptId,
          status: rejectTarget.status,
          feedback,
        },
        { onSuccess: () => setRejectTarget(null) },
      );
      return;
    }

    rejectMutation.mutate(
      { attemptId: rejectTarget.attemptId, feedback },
      { onSuccess: () => setRejectTarget(null) },
    );
  };

  return (
    <motion.div
      className="w-full max-w-7xl space-y-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.header
        className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between"
        variants={fadeInUp}
      >
        <div>
          <h1 className="text-2xl font-bold">Attempt review</h1>
          <p className="text-sm text-muted-foreground">
            Approve good photos and reject bad ones. Approval is transactional and creates the team
            claim.
          </p>
        </div>
        {attemptsQuery.data ? (
          <p className="text-xs text-muted-foreground">
            Refreshes every 5s · {selectedIds.size} selected
          </p>
        ) : null}
      </motion.header>

      {!attemptsQuery.data ? (
        <motion.p
          className="text-sm text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Loading...
        </motion.p>
      ) : (
        <motion.div
          className="space-y-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <AttemptToolbar
            filter={filter}
            attemptsCount={attempts.length}
            selectedCount={selectedIds.size}
            allSelected={allSelected}
            someSelected={someSelected}
            deletePending={deleteMutation.isPending}
            onFilterChange={setFilter}
            onSelectAll={toggleSelectAll}
            onDeleteSelected={() => openDeleteDialog([...selectedIds])}
          />

          {attempts.length === 0 ? (
            <motion.div variants={fadeInUp}>
              <Card className="p-6 text-center text-sm text-muted-foreground">
                No attempts match.
              </Card>
            </motion.div>
          ) : (
            <AnimatePresence>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {attempts.map((a) => (
                  <motion.div
                    key={a.id}
                    variants={fadeInUp}
                    exit={{ opacity: 0, y: -10 }}
                    layout
                  >
                    <AttemptTile
                      attempt={a}
                      selected={selectedIds.has(a.id)}
                      onSelectedChange={(checked) => toggleSelected(a.id, checked)}
                      onOpen={() => setReviewingAttemptId(a.id)}
                    />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </motion.div>
      )}
      <AttemptReviewDialog
        attempt={reviewingAttempt}
        draftStatus={reviewingDraftStatus}
        approvePending={approveMutation.isPending}
        rejectPending={rejectMutation.isPending}
        setStatusPending={setStatusMutation.isPending}
        deletePending={deleteMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setReviewingAttemptId(null);
          }
        }}
        onDraftStatusChange={(status) => {
          if (!reviewingAttempt) return;
          setStatusDrafts((current) => ({
            ...current,
            [reviewingAttempt.id]: status,
          }));
        }}
        onSetStatus={() => {
          if (!reviewingAttempt) return;
          if (reviewingDraftStatus === "REJECTED") {
            openRejectDialog(reviewingAttempt, {
              type: "setStatus",
              status: reviewingDraftStatus,
            });
            return;
          }
          setStatusMutation.mutate({
            attemptId: reviewingAttempt.id,
            status: reviewingDraftStatus,
          });
        }}
        onApprove={() => {
          if (!reviewingAttempt) return;
          approveMutation.mutate({ attemptId: reviewingAttempt.id });
        }}
        onReject={() => {
          if (!reviewingAttempt) return;
          openRejectDialog(reviewingAttempt, { type: "reject" });
        }}
        onDelete={() => {
          if (!reviewingAttempt) return;
          const attemptId = reviewingAttempt.id;
          setReviewingAttemptId(null);
          openDeleteDialog([attemptId]);
        }}
      />
      <RejectAttemptDialog
        target={rejectTarget}
        pending={rejectMutation.isPending || setStatusMutation.isPending}
        onCancel={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
      />
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!deleteMutation.isPending}>
          <DialogHeader>
            <DialogTitle>
              Delete {deleteCount === 1 ? "attempt" : `${deleteCount} attempts`}?
            </DialogTitle>
            <DialogDescription>
              {deleteCount === 1
                ? "This attempt will be permanently removed."
                : `These ${deleteCount} attempts will be permanently removed.`}{" "}
              Any linked claims will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={handleConfirmDelete}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
