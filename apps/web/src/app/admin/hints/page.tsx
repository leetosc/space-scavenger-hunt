"use client";

import type { AppRouter } from "@space-scavenger-hunt/api/routers/index";
import { env } from "@space-scavenger-hunt/env/web";
import { Badge } from "@space-scavenger-hunt/ui/components/badge";
import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
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
  Upload,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
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

function HintEditor({
  hint,
  maxRevealLevel,
  saving,
  deleting,
  replacing,
  onSave,
  onDelete,
  onReplace,
}: {
  hint: Hint;
  maxRevealLevel: number;
  saving: boolean;
  deleting: boolean;
  replacing: boolean;
  onSave: (input: {
    id: string;
    title: string | null;
    description: string | null;
    sortOrder: number;
    active: boolean;
  }) => void;
  onDelete: (id: string) => void;
  onReplace: (id: string, file: File) => void;
}) {
  const [title, setTitle] = useState(hint.title ?? "");
  const [description, setDescription] = useState(hint.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(hint.sortOrder));
  const [active, setActive] = useState(hint.active);
  const [previewLevel, setPreviewLevel] = useState(0);

  return (
    <motion.article variants={fadeInUp}>
      <Card className="overflow-hidden rounded-none border-cyan-400/20 bg-slate-950/65 p-0">
        <HintPreview hint={hint} level={previewLevel} />
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: maxRevealLevel + 1 }, (_, level) => (
              <Button
                key={level}
                type="button"
                size="sm"
                variant={previewLevel === level ? "default" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={() => setPreviewLevel(level)}
              >
                {level}
              </Button>
            ))}
          </div>

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
          </div>
          <div>
            <Label htmlFor={`hint-description-${hint.id}`}>Description</Label>
            <Textarea
              id={`hint-description-${hint.id}`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="accent-cyan-400"
            />
            Active
          </label>

          {hint.reveals.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {hint.reveals.map((reveal) => (
                <Badge
                  key={reveal.id}
                  variant="outline"
                  className="rounded-sm border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                >
                  {reveal.team.name}: {reveal.revealLevel}/{maxRevealLevel}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <motion.div {...buttonInteraction}>
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => {
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
                }}
              >
                <Pencil className="size-3.5" />
                Save
              </Button>
            </motion.div>
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

export default function AdminHintsPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);

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

  const nextSortOrder = useMemo(() => {
    const hints = hintsQuery.data?.hints ?? [];
    return hints.length === 0
      ? 0
      : Math.max(...hints.map((hint) => hint.sortOrder)) + 1;
  }, [hintsQuery.data?.hints]);

  async function uploadNewHint() {
    if (!file) {
      toast.error("Choose a location photo first.");
      return;
    }
    const nextTitle = title.trim();
    const nextSort = Number(sortOrder);
    if (!Number.isInteger(nextSort)) {
      toast.error("Sort order must be a whole number.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("title", nextTitle);
      form.append("description", description);
      form.append("sortOrder", String(nextSort));
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
        throw new Error(body.message ?? `Upload failed (${res.status})`);
      }
      toast.success("Location hint uploaded");
      setTitle("");
      setDescription("");
      setSortOrder(String(nextSort + 1));
      setFile(null);
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
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
              Upload location photo
            </h2>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr_96px_1fr_auto] lg:items-end">
            <div>
              <Label htmlFor="new-hint-title">Title (optional)</Label>
              <Input
                id="new-hint-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Optional label"
              />
            </div>
            <div>
              <Label htmlFor="new-hint-description">
                Description (optional)
              </Label>
              <Input
                id="new-hint-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional admin/team note"
              />
            </div>
            <div>
              <Label htmlFor="new-hint-sort">Sort</Label>
              <Input
                id="new-hint-sort"
                type="number"
                value={sortOrder}
                onFocus={() => {
                  if (sortOrder === "0" && nextSortOrder !== 0)
                    setSortOrder(String(nextSortOrder));
                }}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="new-hint-file">Photo</Label>
              <Input
                id="new-hint-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <motion.div {...buttonInteraction}>
              <Button
                type="button"
                disabled={uploading}
                onClick={uploadNewHint}
              >
                <Upload data-icon="inline-start" className="size-4" />
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </motion.div>
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
                  maxRevealLevel={hintsQuery.data.maxRevealLevel}
                  saving={updateMutation.isPending}
                  deleting={deleteMutation.isPending}
                  replacing={replacingId === hint.id}
                  onSave={(input) => updateMutation.mutate(input)}
                  onDelete={(id) => deleteMutation.mutate({ id })}
                  onReplace={replaceHintPhoto}
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
          <div className="border-b border-cyan-400/15 px-4 py-3">
            <h2 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-slate-100">
              Recent ledger
            </h2>
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
    </motion.div>
  );
}
