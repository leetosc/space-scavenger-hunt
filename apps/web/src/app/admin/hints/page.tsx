"use client";

import type { AppRouter } from "@space-scavenger-hunt/api/routers/index";
import { env } from "@space-scavenger-hunt/env/web";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@space-scavenger-hunt/ui/components/alert-dialog";
import { Badge } from "@space-scavenger-hunt/ui/components/badge";
import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@space-scavenger-hunt/ui/components/dialog";
import { Input } from "@space-scavenger-hunt/ui/components/input";
import { Label } from "@space-scavenger-hunt/ui/components/label";
import { Textarea } from "@space-scavenger-hunt/ui/components/textarea";
import { cn } from "@space-scavenger-hunt/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { AnimatePresence, motion } from "framer-motion";
import {
  ImageOff,
  Pencil,
  RefreshCw,
  Satellite,
  Trash2,
  X,
  Upload,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  buttonInteraction,
  fadeInUp,
  staggerContainer,
} from "@/lib/animations";
import {
  HINT_DISTORTION_BY_LEVEL,
  getHintDistortion,
} from "@/lib/hint-distortion";
import { trpc } from "@/utils/trpc";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Hint = RouterOutputs["hint"]["adminList"]["hints"][number];
type Team = RouterOutputs["hint"]["adminList"]["teams"][number];
type PendingHintUpload = {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  description: string;
  sortOrder: string;
};

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function formatDelta(delta: number) {
  return delta > 0 ? `+${delta}` : String(delta);
}

function HintPreview({ hint, level }: { hint: Hint; level: number }) {
  const distortion = getHintDistortion(level);
  const fullyRevealed = level >= HINT_DISTORTION_BY_LEVEL.length - 1;
  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
      {hint.previewUrl ? (
        <>
          <Image
            src={hint.previewUrl}
            alt={hint.title || "Location hint photo"}
            fill
            sizes="(min-width: 1024px) 340px, 100vw"
            className="object-cover"
            style={{
              filter: `blur(${distortion.blur}px) contrast(${distortion.contrast}) saturate(${distortion.saturate})`,
              transform: `scale(${distortion.scale})`,
            }}
            referrerPolicy="no-referrer"
          />
          {!fullyRevealed ? (
            <>
              <Image
                src={hint.previewUrl}
                alt=""
                fill
                aria-hidden="true"
                sizes="(min-width: 1024px) 340px, 100vw"
                className="object-cover mix-blend-screen"
                style={{
                  clipPath:
                    "polygon(0 8%,100% 3%,100% 18%,0 23%,0 42%,100% 35%,100% 49%,0 56%,0 78%,100% 72%,100% 86%,0 92%)",
                  filter: `blur(${Math.max(3, distortion.blur / 2)}px) hue-rotate(35deg) contrast(1.35)`,
                  opacity: distortion.sliceOpacity,
                  transform: `translateX(${level === 0 ? 4 : 2}%) scale(${level === 0 ? 1.12 : 1.05})`,
                }}
                referrerPolicy="no-referrer"
              />
              <Image
                src={hint.previewUrl}
                alt=""
                fill
                aria-hidden="true"
                sizes="(min-width: 1024px) 340px, 100vw"
                className="object-cover mix-blend-multiply"
                style={{
                  clipPath:
                    "polygon(0 0,100% 0,100% 6%,0 12%,0 31%,100% 26%,100% 39%,0 45%,0 64%,100% 58%,100% 70%,0 76%,0 94%,100% 88%,100% 100%,0 100%)",
                  filter: `blur(${Math.max(2, distortion.blur / 3)}px) grayscale(0.7)`,
                  opacity: distortion.sliceOpacity * 0.7,
                  transform: `translateX(${level === 0 ? -5 : -2}%) scale(${level === 0 ? 1.1 : 1.04})`,
                }}
                referrerPolicy="no-referrer"
              />
              <div
                className="absolute inset-0 bg-[linear-gradient(rgba(125,211,252,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.08)_1px,transparent_1px)] bg-[length:100%_8px,10px_100%] mix-blend-screen"
                style={{ opacity: distortion.gridOpacity }}
              />
              <div
                className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,rgba(2,6,23,0.3)_38%,rgba(2,6,23,0.74)_100%)]"
                style={{ opacity: distortion.maskOpacity }}
              />
            </>
          ) : null}
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
          <ImageOff className="size-8" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
            No image signal
          </span>
        </div>
      )}
      <Badge
        variant="outline"
        className="absolute left-2 top-2 rounded-sm border-cyan-400/35 bg-slate-950/80 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200 backdrop-blur"
      >
        Level {level}
      </Badge>
    </div>
  );
}

function RevealLevelSummary({
  teams,
  revealByTeamId,
  maxRevealLevel,
}: {
  teams: Team[];
  revealByTeamId: Map<string, Hint["reveals"][number]>;
  maxRevealLevel: number;
}) {
  if (teams.length === 0) {
    return (
      <div className="border border-cyan-400/10 bg-slate-950/35 px-3 py-2 text-xs text-muted-foreground">
        No teams configured.
      </div>
    );
  }

  return (
    <div className="border border-cyan-400/10 bg-slate-950/45 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300/75">
          Team reveal levels
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          /{maxRevealLevel}
        </p>
      </div>
      <div className="grid gap-2">
        {teams.map((team) => {
          const revealLevel = revealByTeamId.get(team.id)?.revealLevel ?? 0;
          return (
            <div
              key={team.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-sm text-[9px] font-black text-white shadow-[0_0_12px_rgba(255,255,255,0.08)]"
                  style={{ backgroundColor: team.color ?? "#0891b2" }}
                >
                  {team.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="truncate text-xs font-semibold text-slate-200">
                  {team.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: maxRevealLevel + 1 }, (_, level) => (
                  <span
                    key={level}
                    className={cn(
                      "size-2 rounded-full border transition-colors",
                      level <= revealLevel
                        ? "border-cyan-200 bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.7)]"
                        : "border-slate-600 bg-slate-900",
                    )}
                    title={`${team.name}: level ${revealLevel}/${maxRevealLevel}`}
                  />
                ))}
                <span className="ml-1 min-w-7 text-right font-mono text-[10px] text-cyan-200">
                  {revealLevel}/{maxRevealLevel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HintEditor({
  hint,
  teams,
  maxRevealLevel,
  saving,
  deleting,
  replacing,
  updatingReveal,
  onSave,
  onDelete,
  onReplace,
  onSetRevealLevel,
}: {
  hint: Hint;
  teams: Team[];
  maxRevealLevel: number;
  saving: boolean;
  deleting: boolean;
  replacing: boolean;
  updatingReveal: boolean;
  onSave: (input: {
    id: string;
    title: string | null;
    description: string | null;
    sortOrder: number;
    active: boolean;
  }) => void;
  onDelete: (id: string) => void;
  onReplace: (id: string, file: File) => void;
  onSetRevealLevel: (input: {
    teamId: string;
    locationHintId: string;
    revealLevel: number;
  }) => void;
}) {
  const [title, setTitle] = useState(hint.title ?? "");
  const [description, setDescription] = useState(hint.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(hint.sortOrder));
  const [active, setActive] = useState(hint.active);
  const [previewLevel, setPreviewLevel] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const revealByTeamId = useMemo(
    () => new Map(hint.reveals.map((reveal) => [reveal.team.id, reveal])),
    [hint.reveals],
  );
  const revealedTeamCount = hint.reveals.filter(
    (reveal) => reveal.revealLevel > 0,
  ).length;

  function saveDetails() {
    const nextSort = Number(sortOrder);
    if (!Number.isInteger(nextSort)) {
      toast.error("Sort order must be a whole number.");
      return;
    }
    onSave({
      id: hint.id,
      title: title.trim() || null,
      description: description.trim() || null,
      sortOrder: nextSort,
      active,
    });
  }

  return (
    <motion.article variants={fadeInUp}>
      <Card className="overflow-hidden rounded-none border-cyan-400/20 bg-slate-950/65 p-0">
        <HintPreview hint={hint} level={previewLevel} />
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-100">
                {hint.title || ""}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge
                  variant="outline"
                  className="rounded-sm border-cyan-400/25 bg-cyan-400/10 font-mono text-[10px] text-cyan-200"
                >
                  Sort {hint.sortOrder}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-sm font-mono text-[10px]",
                    hint.active
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                      : "border-slate-400/20 bg-slate-400/10 text-slate-300",
                  )}
                >
                  {hint.active ? "Active" : "Inactive"}
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-sm border-amber-400/25 bg-amber-400/10 font-mono text-[10px] text-amber-200"
                >
                  {revealedTeamCount}/{teams.length} teams
                </Badge>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cyan-400/10 pt-3">
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: maxRevealLevel + 1 }, (_, level) => (
                <Button
                  key={level}
                  type="button"
                  size="sm"
                  variant={previewLevel === level ? "default" : "outline"}
                  className="h-7 min-w-8 px-2 text-xs"
                  onClick={() => setPreviewLevel(level)}
                >
                  {level}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRevealOpen(true)}
            >
              <Zap className="size-3.5" />
              Reveals
            </Button>
          </div>

          <RevealLevelSummary
            teams={teams}
            revealByTeamId={revealByTeamId}
            maxRevealLevel={maxRevealLevel}
          />

          <div className="flex flex-wrap items-center gap-2 border-t border-cyan-400/10 pt-3">
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 border border-input bg-background px-2.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
              <RefreshCw className="size-3.5" />
              {replacing ? "Replacing..." : "Replace"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={replacing}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = "";
                  if (file) onReplace(hint.id, file);
                }}
              />
            </label>
            <motion.div {...buttonInteraction}>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={deleting}
                onClick={() => onDelete(hint.id)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </motion.div>
          </div>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Edit location photo</DialogTitle>
              <DialogDescription className="sr-only">
                Update the title, description, sort order, and active state.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-[1fr_96px]">
              <div>
                <Label htmlFor={`hint-title-${hint.id}`}>Title</Label>
                <Input
                  id={`hint-title-${hint.id}`}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={`hint-sort-${hint.id}`}>Sort</Label>
                <Input
                  id={`hint-sort-${hint.id}`}
                  type="number"
                  inputMode="numeric"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor={`hint-description-${hint.id}`}>
                  Description
                </Label>
                <Textarea
                  id={`hint-description-${hint.id}`}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                  className="accent-cyan-400"
                />
                Active
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={saveDetails}
              >
                <Pencil className="size-3.5" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={revealOpen} onOpenChange={setRevealOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Team reveal levels</DialogTitle>
              <DialogDescription className="sr-only">
                Set each team&apos;s reveal level for this photo.
              </DialogDescription>
            </DialogHeader>
            <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {teams.map((team) => {
                const reveal = revealByTeamId.get(team.id);
                const currentRevealLevel = reveal?.revealLevel ?? 0;
                return (
                  <li
                    key={team.id}
                    className="grid gap-2 border border-cyan-400/10 bg-slate-950/55 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">
                        {team.name}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        Level {currentRevealLevel}/{maxRevealLevel}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(
                        { length: maxRevealLevel + 1 },
                        (_, level) => (
                          <Button
                            key={level}
                            type="button"
                            size="sm"
                            variant={
                              currentRevealLevel === level
                                ? "default"
                                : "outline"
                            }
                            className="h-7 min-w-8 px-2 text-xs"
                            disabled={updatingReveal}
                            onClick={() =>
                              onSetRevealLevel({
                                teamId: team.id,
                                locationHintId: hint.id,
                                revealLevel: level,
                              })
                            }
                          >
                            {level}
                          </Button>
                        ),
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </DialogContent>
        </Dialog>
      </Card>
    </motion.article>
  );
}

function TeamBoostControls({
  team,
  adjusting,
  resetting,
  onAdjust,
  onReset,
}: {
  team: Team;
  adjusting: boolean;
  resetting: boolean;
  onAdjust: (teamId: string, delta: number, note?: string) => void;
  onReset: (teamId: string) => void;
}) {
  const [delta, setDelta] = useState("1");
  const [note, setNote] = useState("");

  return (
    <li className="grid gap-2 border border-cyan-400/15 bg-slate-900/55 p-3 sm:grid-cols-[1fr_80px_1fr_auto_auto] sm:items-end">
      <div>
        <p className="truncate text-sm font-bold text-slate-100">{team.name}</p>
        <p className="font-mono text-xs text-cyan-300">
          {team.signalBoostBalance} Signal Boost
          {team.signalBoostBalance === 1 ? "" : "s"}
        </p>
      </div>
      <div>
        <Label
          htmlFor={`boost-delta-${team.id}`}
          className="text-[10px] uppercase"
        >
          Delta
        </Label>
        <Input
          id={`boost-delta-${team.id}`}
          type="number"
          value={delta}
          onChange={(event) => setDelta(event.target.value)}
          className="h-8"
        />
      </div>
      <div>
        <Label
          htmlFor={`boost-note-${team.id}`}
          className="text-[10px] uppercase"
        >
          Note
        </Label>
        <Input
          id={`boost-note-${team.id}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="h-8"
          placeholder="Optional"
        />
      </div>
      <Button
        type="button"
        size="sm"
        disabled={adjusting}
        onClick={() => {
          const parsed = Number(delta);
          if (!Number.isInteger(parsed) || parsed === 0) {
            toast.error("Enter a non-zero whole number.");
            return;
          }
          onAdjust(team.id, parsed, note || undefined);
        }}
      >
        Adjust
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={resetting}
        onClick={() => onReset(team.id)}
      >
        Reset
      </Button>
    </li>
  );
}

function PendingUploadCard({
  item,
  onChange,
  onRemove,
}: {
  item: PendingHintUpload;
  onChange: (
    id: string,
    patch: Partial<Omit<PendingHintUpload, "id" | "file" | "previewUrl">>,
  ) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <li className="overflow-hidden border border-cyan-400/15 bg-slate-900/55">
      <div className="relative aspect-[4/3] bg-slate-950">
        <Image
          src={item.previewUrl}
          alt={item.title || item.file.name}
          fill
          sizes="(min-width: 1280px) 260px, (min-width: 768px) 33vw, 100vw"
          className="object-cover"
          unoptimized
        />
        <Button
          type="button"
          size="icon-sm"
          variant="destructive"
          className="absolute right-2 top-2"
          aria-label={`Remove ${item.file.name}`}
          onClick={() => onRemove(item.id)}
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="grid gap-3 p-3 sm:grid-cols-[1fr_88px]">
        <div>
          <Label htmlFor={`pending-title-${item.id}`}>Title (optional)</Label>
          <Input
            id={`pending-title-${item.id}`}
            value={item.title}
            onChange={(event) =>
              onChange(item.id, { title: event.target.value })
            }
            placeholder="Optional label"
          />
        </div>
        <div>
          <Label htmlFor={`pending-sort-${item.id}`}>Sort</Label>
          <Input
            id={`pending-sort-${item.id}`}
            type="number"
            inputMode="numeric"
            value={item.sortOrder}
            onChange={(event) =>
              onChange(item.id, { sortOrder: event.target.value })
            }
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor={`pending-description-${item.id}`}>
            Description (optional)
          </Label>
          <Textarea
            id={`pending-description-${item.id}`}
            value={item.description}
            rows={2}
            onChange={(event) =>
              onChange(item.id, { description: event.target.value })
            }
            placeholder="Optional admin/team note"
          />
        </div>
        <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:col-span-2">
          {item.file.name} · {(item.file.size / (1024 * 1024)).toFixed(2)} MB
        </p>
      </div>
    </li>
  );
}

export default function AdminHintsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadsRef = useRef<PendingHintUpload[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingHintUpload[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [clearLedgerOpen, setClearLedgerOpen] = useState(false);

  const hintsQuery = useQuery(trpc.hint.adminList.queryOptions());
  const ledgerQuery = useQuery(
    trpc.hint.adminLedger.queryOptions({ limit: 30 }),
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: trpc.hint.adminList.queryKey() });
    queryClient.invalidateQueries({
      queryKey: trpc.hint.adminLedger.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.hint.listForTeam.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.activity.validateSetup.queryKey(),
    });
  };

  const updateMutation = useMutation({
    ...trpc.hint.adminUpdate.mutationOptions(),
    onSuccess: () => {
      toast.success("Hint updated");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteMutation = useMutation({
    ...trpc.hint.adminDelete.mutationOptions(),
    onSuccess: () => {
      toast.success("Hint deleted");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const adjustMutation = useMutation({
    ...trpc.hint.adminAdjustTeamBoosts.mutationOptions(),
    onSuccess: () => {
      toast.success("Signal Boost balance updated");
      invalidate();
      queryClient.invalidateQueries({
        queryKey: trpc.team.getDashboard.queryKey(),
      });
    },
    onError: (error) => toast.error(error.message),
  });
  const resetMutation = useMutation({
    ...trpc.hint.adminGrantInitialToTeam.mutationOptions(),
    onSuccess: () => {
      toast.success("Signal Boosts reset");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const clearLedgerMutation = useMutation({
    ...trpc.hint.adminClearLedger.mutationOptions(),
    onSuccess: (data) => {
      toast.success(
        data.deletedCount === 1
          ? "1 ledger entry cleared"
          : `${data.deletedCount} ledger entries cleared`,
      );
      setClearLedgerOpen(false);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const setRevealLevelMutation = useMutation({
    ...trpc.hint.adminSetTeamRevealLevel.mutationOptions(),
    onSuccess: () => {
      toast.success("Team reveal level updated");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const nextSortOrder = useMemo(() => {
    const hints = hintsQuery.data?.hints ?? [];
    return hints.length === 0
      ? 0
      : Math.max(...hints.map((hint) => hint.sortOrder)) + 1;
  }, [hintsQuery.data?.hints]);

  useEffect(() => {
    pendingUploadsRef.current = pendingUploads;
  }, [pendingUploads]);

  useEffect(() => {
    return () => {
      for (const item of pendingUploadsRef.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  function addPendingFiles(files: File[]) {
    const validFiles = files.filter((file) => {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        toast.error(`${file.name} is not a JPG, PNG, or WebP image.`);
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;

    setPendingUploads((current) => {
      const pendingSortOrders = current
        .map((item) => Number(item.sortOrder))
        .filter(Number.isInteger);
      const baseSortOrder = Math.max(
        nextSortOrder,
        ...pendingSortOrders.map((value) => value + 1),
      );
      const nextItems = validFiles.map((file, index) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        title: "",
        description: "",
        sortOrder: String(baseSortOrder + index),
      }));
      return [...current, ...nextItems];
    });
  }

  function updatePendingUpload(
    id: string,
    patch: Partial<Omit<PendingHintUpload, "id" | "file" | "previewUrl">>,
  ) {
    setPendingUploads((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function removePendingUpload(id: string) {
    setPendingUploads((current) => {
      const item = current.find((pending) => pending.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return current.filter((pending) => pending.id !== id);
    });
  }

  function clearPendingUploads() {
    for (const item of pendingUploads) {
      URL.revokeObjectURL(item.previewUrl);
    }
    setPendingUploads([]);
  }

  async function uploadPendingHints() {
    if (pendingUploads.length === 0) {
      toast.error("Drop or select location photos first.");
      return;
    }

    for (const item of pendingUploads) {
      if (!Number.isInteger(Number(item.sortOrder))) {
        toast.error(`Sort order for ${item.file.name} must be a whole number.`);
        return;
      }
    }

    setUploading(true);
    let uploaded = 0;
    const uploadedIds = new Set<string>();
    try {
      for (const item of pendingUploads) {
        const form = new FormData();
        form.append("image", item.file);
        form.append("title", item.title.trim());
        form.append("description", item.description);
        form.append("sortOrder", String(Number(item.sortOrder)));
        const res = await fetch(
          `${env.NEXT_PUBLIC_SERVER_URL}/api/location-hints/upload`,
          {
            method: "POST",
            body: form,
            credentials: "include",
          },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.message ??
              `Upload failed for ${item.file.name} (${res.status})`,
          );
        }
        uploaded += 1;
        uploadedIds.add(item.id);
      }
      toast.success(
        uploaded === 1
          ? "Location hint uploaded"
          : `${uploaded} location hints uploaded`,
      );
      clearPendingUploads();
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
      if (uploaded > 0) {
        setPendingUploads((current) => {
          const remaining = current.filter((item) => !uploadedIds.has(item.id));
          for (const item of current) {
            if (uploadedIds.has(item.id)) URL.revokeObjectURL(item.previewUrl);
          }
          return remaining;
        });
        invalidate();
      }
    } finally {
      setUploading(false);
    }
  }

  async function replaceHintPhoto(hintId: string, nextFile: File) {
    setReplacingId(hintId);
    try {
      const form = new FormData();
      form.append("image", nextFile);
      const res = await fetch(
        `${env.NEXT_PUBLIC_SERVER_URL}/api/location-hints/${hintId}/upload`,
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
      toast.success("Photo replaced");
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setReplacingId(null);
    }
  }

  return (
    <motion.div
      className="w-full max-w-7xl space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.header
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        variants={fadeInUp}
      >
        <div>
          <div className="mb-2 inline-flex items-center gap-2 border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">
            <Satellite className="size-3.5" />
            Signal Boost control
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Hints</h1>
          <p className="text-sm text-muted-foreground">
            Manage shared location photos and team Signal Boost balances.
          </p>
        </div>
      </motion.header>

      <motion.div variants={fadeInUp}>
        <Card className="overflow-hidden rounded-none border-cyan-400/25 bg-slate-950/55 p-0">
          <div className="border-b border-cyan-400/15 px-4 py-3">
            <h2 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-slate-100">
              Upload location photos
            </h2>
          </div>
          <div className="space-y-4 p-4">
            <div
              role="button"
              tabIndex={0}
              className={cn(
                "relative overflow-hidden rounded-lg border border-dashed border-cyan-500/25 bg-slate-950/60 p-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60",
                isDragActive
                  ? "border-cyan-300 bg-cyan-400/10"
                  : "hover:border-cyan-400/45 hover:bg-slate-900/60",
              )}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (event.currentTarget === event.target) {
                  setIsDragActive(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragActive(false);
                addPendingFiles(Array.from(event.dataTransfer.files));
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  addPendingFiles(Array.from(event.target.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-indigo-500/5" />
              <div className="relative flex flex-col items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-md border border-cyan-400/25 bg-cyan-400/10 text-cyan-200">
                  <Upload className="size-5" />
                </div>
                <div>
                  <p className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-cyan-200">
                    Drop location photos
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Drag multiple JPG, PNG, or WebP files here, or click to
                    select.
                  </p>
                </div>
              </div>
            </div>

            {pendingUploads.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-300">
                    {pendingUploads.length} pending transmission
                    {pendingUploads.length === 1 ? "" : "s"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={clearPendingUploads}
                    >
                      Clear
                    </Button>
                    <motion.div {...buttonInteraction}>
                      <Button
                        type="button"
                        size="sm"
                        disabled={uploading}
                        onClick={uploadPendingHints}
                      >
                        <Upload data-icon="inline-start" className="size-4" />
                        {uploading ? "Uploading..." : "Upload all"}
                      </Button>
                    </motion.div>
                  </div>
                </div>
                <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {pendingUploads.map((item) => (
                    <PendingUploadCard
                      key={item.id}
                      item={item}
                      onChange={updatePendingUpload}
                      onRemove={removePendingUpload}
                    />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Card>
      </motion.div>

      <section className="space-y-3">
        <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
          Location photos
        </h2>
        {!hintsQuery.data ? (
          <p className="text-sm text-muted-foreground">Loading hints...</p>
        ) : hintsQuery.data.hints.length === 0 ? (
          <Card className="rounded-none border-cyan-400/20 bg-slate-950/55 p-6 text-center text-sm text-muted-foreground">
            No location hint photos yet.
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            <AnimatePresence>
              {hintsQuery.data.hints.map((hint) => (
                <HintEditor
                  key={hint.id}
                  hint={hint}
                  teams={hintsQuery.data.teams}
                  maxRevealLevel={hintsQuery.data.maxRevealLevel}
                  saving={updateMutation.isPending}
                  deleting={deleteMutation.isPending}
                  replacing={replacingId === hint.id}
                  updatingReveal={setRevealLevelMutation.isPending}
                  onSave={(input) => updateMutation.mutate(input)}
                  onDelete={(id) => deleteMutation.mutate({ id })}
                  onReplace={replaceHintPhoto}
                  onSetRevealLevel={(input) =>
                    setRevealLevelMutation.mutate(input)
                  }
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <Card className="rounded-none border-cyan-400/20 bg-slate-950/55 p-0">
          <div className="border-b border-cyan-400/15 px-4 py-3">
            <h2 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-slate-100">
              Team Signal Boosts
            </h2>
          </div>
          <ul className="grid gap-3 p-4">
            {(hintsQuery.data?.teams ?? []).map((team) => (
              <TeamBoostControls
                key={team.id}
                team={team}
                adjusting={adjustMutation.isPending}
                resetting={resetMutation.isPending}
                onAdjust={(teamId, delta, note) =>
                  adjustMutation.mutate({ teamId, delta, note })
                }
                onReset={(teamId) => resetMutation.mutate({ teamId })}
              />
            ))}
          </ul>
        </Card>

        <Card className="rounded-none border-cyan-400/20 bg-slate-950/55 p-0">
          <div className="flex items-center justify-between gap-3 border-b border-cyan-400/15 px-4 py-3">
            <h2 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-slate-100">
              Recent ledger
            </h2>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={
                clearLedgerMutation.isPending ||
                !ledgerQuery.data ||
                ledgerQuery.data.length === 0
              }
              onClick={() => setClearLedgerOpen(true)}
            >
              <Trash2 className="size-3.5" />
              Clear ledger
            </Button>
          </div>
          <div className="max-h-[520px] overflow-y-auto p-4">
            {!ledgerQuery.data ? (
              <p className="text-sm text-muted-foreground">Loading ledger...</p>
            ) : ledgerQuery.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No Signal Boost activity yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {ledgerQuery.data.map((entry) => (
                  <li
                    key={entry.id}
                    className="border border-cyan-400/15 bg-slate-900/55 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-100">
                          {entry.team.name}
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          {entry.type.replaceAll("_", " ")}
                          {entry.locationHint?.title
                            ? ` · ${entry.locationHint.title}`
                            : ""}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-sm font-mono",
                          entry.delta >= 0
                            ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-200"
                            : "border-amber-400/35 bg-amber-400/10 text-amber-200",
                        )}
                      >
                        <Zap className="mr-1 size-3" />
                        {formatDelta(entry.delta)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Balance after: {entry.balanceAfter}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </section>

      <AlertDialog open={clearLedgerOpen} onOpenChange={setClearLedgerOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear ledger history?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes all Signal Boost ledger entries from the admin hints
              page. Team balances and hint reveal progress will stay as-is.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearLedgerMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={clearLedgerMutation.isPending}
              onClick={() => clearLedgerMutation.mutate()}
            >
              {clearLedgerMutation.isPending ? "Clearing..." : "Clear ledger"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
