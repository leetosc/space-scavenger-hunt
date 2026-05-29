"use client";

import { env } from "@space-scavenger-hunt/env/web";
import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { FileUpload } from "@space-scavenger-hunt/ui/components/ui/file-upload";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@space-scavenger-hunt/ui/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@space-scavenger-hunt/ui/components/tooltip";
import { cn } from "@space-scavenger-hunt/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  Check,
  ImagePlus,
  Orbit,
  Pencil,
  Power,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import Image from "next/image";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  staggerContainer,
  fadeInUp,
  scaleIn,
  buttonInteraction,
  iconButtonInteraction,
  springTransition,
} from "@/lib/animations";
import { ICON_MAP } from "@/lib/icons";
import { trpc } from "@/utils/trpc";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TeamInfo = { id: string; name: string; color: string | null; icon: string | null };

type Astronaut = {
  id: string;
  name: string;
  description: string | null;
  hint: string | null;
  previewUrl?: string;
  code: string;
  active: boolean;
  assignedTeam: TeamInfo | null;
  claimedTeam: TeamInfo | null;
};

type TeamStats = TeamInfo & {
  assignedCount: number;
  claimedCount: number;
};

type ColumnCallbacks = {
  appBaseUrl: string;
  onCopyUrl: (scanUrl: string) => void;
  onToggleActive: (id: string) => void;
  onUpdateCode: (id: string, code: string) => void;
  onDelete: (id: string, name: string) => void;
  onEditAssignment: (astronaut: Astronaut) => void;
  onEditClaim: (astronaut: Astronaut) => void;
  onEditImage: (astronaut: Astronaut) => void;
  isUpdatingCode: boolean;
};

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function IconActionButton({
  label,
  onClick,
  variant = "ghost",
  children,
}: {
  label: string;
  onClick: () => void;
  variant?: "ghost" | "destructive";
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <motion.div {...iconButtonInteraction} className="inline-flex">
            <Button
              type="button"
              size="icon-sm"
              variant={variant}
              aria-label={label}
              onClick={onClick}
            >
              {children}
            </Button>
          </motion.div>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function filterCode(value: string): string {
  return value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4);
}

function CodeCell({
  astronaut,
  callbacks,
}: {
  astronaut: Astronaut;
  callbacks: ColumnCallbacks;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [code, setCode] = useState(astronaut.code);
  const scanUrl = `${callbacks.appBaseUrl}/astronaut/${astronaut.code}`;
  const canSave = code.length === 4 && code !== astronaut.code;

  if (isEditing) {
    return (
      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave || callbacks.isUpdatingCode) return;
          callbacks.onUpdateCode(astronaut.id, code);
          setIsEditing(false);
        }}
      >
        <Input
          value={code}
          onChange={(e) => setCode(filterCode(e.target.value))}
          className="h-8 w-20 font-mono text-xs uppercase"
          aria-label={`Edit code for ${astronaut.name}`}
          maxLength={4}
          autoFocus
        />
        <IconActionButton
          label="Save code"
          onClick={() => {
            if (!canSave || callbacks.isUpdatingCode) return;
            callbacks.onUpdateCode(astronaut.id, code);
            setIsEditing(false);
          }}
        >
          <Check className="size-3.5" />
        </IconActionButton>
        <IconActionButton
          label="Cancel"
          onClick={() => {
            setCode(astronaut.code);
            setIsEditing(false);
          }}
        >
          <X className="size-3.5" />
        </IconActionButton>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <code className="bg-muted px-2 py-0.5 rounded text-xs shrink-0">{astronaut.code}</code>
      <IconActionButton
        label="Edit code"
        onClick={() => {
          setCode(astronaut.code);
          setIsEditing(true);
        }}
      >
        <Pencil className="size-3.5" />
      </IconActionButton>
      <Tooltip>
        <TooltipTrigger
          render={
            <motion.div {...buttonInteraction}>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => callbacks.onCopyUrl(scanUrl)}
              >
                Copy
              </Button>
            </motion.div>
          }
        />
        <TooltipContent className="max-w-sm whitespace-normal break-all">
          {scanUrl}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team badge
// ---------------------------------------------------------------------------

function TeamBadge({ team }: { team: TeamInfo }) {
  const Icon = team.icon ? ICON_MAP[team.icon] : null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-white"
        style={{ backgroundColor: team.color ?? "#888" }}
      >
        {Icon ? (
          <Icon className="size-3" />
        ) : (
          <span className="text-[9px] font-bold">{team.name.slice(0, 1)}</span>
        )}
      </span>
      <span className="text-xs truncate">{team.name}</span>
    </span>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof Orbit;
}) {
  return (
    <div className="border border-border/60 bg-muted/20 px-3 py-2">
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="font-mono text-[9px] uppercase tracking-[0.16em]">
          {label}
        </span>
      </div>
      <div className="font-mono text-lg font-bold">{value}</div>
    </div>
  );
}

function TeamStatCard({ team }: { team: TeamStats }) {
  const total = team.assignedCount;
  const progress = total > 0 ? Math.round((team.claimedCount / total) * 100) : 0;

  return (
    <motion.div
      variants={fadeInUp}
      className="overflow-hidden border bg-card"
      style={{
        borderColor: team.color ? `${team.color}55` : undefined,
        boxShadow: team.color ? `0 0 18px ${team.color}14` : undefined,
      }}
    >
      <div className="flex min-w-0 items-center gap-2 border-b px-3 py-2">
        <TeamBadge team={team} />
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {progress}%
        </span>
      </div>
      <div className="grid grid-cols-2 divide-x">
        <div className="px-3 py-2">
          <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
            <Orbit className="size-3.5" />
            <span className="font-mono text-[9px] uppercase tracking-[0.16em]">
              Assigned
            </span>
          </div>
          <div className="font-mono text-lg font-bold">{team.assignedCount}</div>
        </div>
        <div className="px-3 py-2">
          <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            <span className="font-mono text-[9px] uppercase tracking-[0.16em]">
              Claimed
            </span>
          </div>
          <div className="font-mono text-lg font-bold">{team.claimedCount}</div>
        </div>
      </div>
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary"
          style={{
            width: `${progress}%`,
            backgroundColor: team.color ?? undefined,
          }}
        />
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Assign team dialog
// ---------------------------------------------------------------------------

function AssignTeamDialog({
  astronaut,
  teams,
  open,
  onOpenChange,
  onAssign,
  onUnassign,
  isPending,
}: {
  astronaut: Astronaut;
  teams: TeamInfo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (astronautId: string, teamId: string) => void;
  onUnassign: (astronautId: string, teamId: string) => void;
  isPending: boolean;
}) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    astronaut.assignedTeam?.id ?? null,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign team</DialogTitle>
          <DialogDescription>
            Choose a team for {astronaut.name}.
          </DialogDescription>
        </DialogHeader>

        <motion.div
          className="space-y-2"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.button
            type="button"
            onClick={() => setSelectedTeamId(null)}
            className={cn(
              "flex w-full items-center rounded-md border px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50",
              selectedTeamId === null
                ? "border-ring ring-1 ring-ring/50 bg-muted/30"
                : "border-border/60",
            )}
            variants={fadeInUp}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <span className="text-muted-foreground">Unassigned</span>
          </motion.button>
          {teams.map((team) => (
            <motion.button
              key={team.id}
              type="button"
              onClick={() => setSelectedTeamId(team.id)}
              className={cn(
                "flex w-full items-center rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted/50",
                selectedTeamId === team.id
                  ? "border-ring ring-1 ring-ring/50 bg-muted/30"
                  : "border-border/60",
              )}
              variants={fadeInUp}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <TeamBadge team={team} />
            </motion.button>
          ))}
        </motion.div>

        <DialogFooter>
          <motion.div {...buttonInteraction}>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => {
                const currentTeamId = astronaut.assignedTeam?.id ?? null;
                if (selectedTeamId === currentTeamId) {
                  onOpenChange(false);
                  return;
                }
                if (selectedTeamId) {
                  onAssign(astronaut.id, selectedTeamId);
                } else if (currentTeamId) {
                  onUnassign(astronaut.id, currentTeamId);
                }
                onOpenChange(false);
              }}
            >
              Save
            </Button>
          </motion.div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClaimedStatusDialog({
  astronaut,
  teams,
  open,
  onOpenChange,
  onSetClaimedByTeam,
  isPending,
}: {
  astronaut: Astronaut;
  teams: TeamInfo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetClaimedByTeam: (astronautId: string, teamId: string | null) => void;
  isPending: boolean;
}) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    astronaut.claimedTeam?.id ?? null,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Claimed status</DialogTitle>
          <DialogDescription>
            Choose which team has claimed {astronaut.name}, or clear the claim.
          </DialogDescription>
        </DialogHeader>

        <motion.div
          className="space-y-2"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.button
            type="button"
            onClick={() => setSelectedTeamId(null)}
            className={cn(
              "flex w-full items-center rounded-md border px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50",
              selectedTeamId === null
                ? "border-ring ring-1 ring-ring/50 bg-muted/30"
                : "border-border/60",
            )}
            variants={fadeInUp}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <span className="text-muted-foreground">Unclaimed</span>
          </motion.button>
          {teams.map((team) => (
            <motion.button
              key={team.id}
              type="button"
              onClick={() => setSelectedTeamId(team.id)}
              className={cn(
                "flex w-full items-center rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted/50",
                selectedTeamId === team.id
                  ? "border-ring ring-1 ring-ring/50 bg-muted/30"
                  : "border-border/60",
              )}
              variants={fadeInUp}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <TeamBadge team={team} />
            </motion.button>
          ))}
        </motion.div>

        <DialogFooter>
          <motion.div {...buttonInteraction}>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => {
                const currentTeamId = astronaut.claimedTeam?.id ?? null;
                if (selectedTeamId !== currentTeamId) {
                  onSetClaimedByTeam(astronaut.id, selectedTeamId);
                }
                onOpenChange(false);
              }}
            >
              Save
            </Button>
          </motion.div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AstronautImageDialog({
  astronaut,
  open,
  onOpenChange,
  onUpload,
  isPending,
}: {
  astronaut: Astronaut;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (astronautId: string, file: File) => Promise<void>;
  isPending: boolean;
}) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  function clearPendingImage() {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(null);
    setPendingFile(null);
  }

  function handleFileSelect(files: File[]) {
    const file = files[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error("Only JPG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Image must be 8MB or smaller.");
      return;
    }
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setPendingFile(file);
    setLocalPreviewUrl(URL.createObjectURL(file));
  }

  const previewSrc = localPreviewUrl ?? astronaut.previewUrl;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isPending) clearPendingImage();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Astronaut image</DialogTitle>
          <DialogDescription>
            Upload a JPG, PNG, or WebP image for {astronaut.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {previewSrc ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted/20">
              <Image
                src={previewSrc}
                alt={`${astronaut.name} image preview`}
                fill
                sizes="(min-width: 640px) 480px, calc(100vw - 48px)"
                className="object-contain"
                unoptimized
              />
            </div>
          ) : null}

          {pendingFile ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {pendingFile.name}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={clearPendingImage}
              >
                Choose another
              </Button>
            </div>
          ) : (
            <div className="min-h-72 overflow-hidden rounded-lg border border-dashed border-cyan-500/20 bg-slate-950/50">
              <FileUpload onChange={handleFileSelect} disabled={isPending} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!pendingFile || isPending}
            onClick={async () => {
              if (!pendingFile) return;
              try {
                await onUpload(astronaut.id, pendingFile);
                clearPendingImage();
                onOpenChange(false);
              } catch {
                // Error toast is handled by the upload caller.
              }
            }}
          >
            <Upload className="size-3.5" />
            {isPending ? "Uploading..." : "Upload image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

function useColumns(callbacks: ColumnCallbacks) {
  return useMemo<ColumnDef<Astronaut>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ row }) => {
          const a = row.original;
          return (
            <div className="flex min-w-0 items-center gap-2">
              {a.previewUrl ? (
                <div className="relative size-10 shrink-0 overflow-hidden rounded-md border bg-muted/20">
                  <Image
                    src={a.previewUrl}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : null}
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{a.name}</p>
                  <span
                    className={cn(
                      "text-[11px] px-1.5 py-0.5 rounded-sm border shrink-0",
                      a.active
                        ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                        : "border-border/40 text-muted-foreground",
                    )}
                  >
                    {a.active ? "Active" : "Inactive"}
                  </span>
                </div>
                {a.hint ? (
                  <p className="text-[11px] text-muted-foreground truncate">{a.hint}</p>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "description",
        header: "Description",
        meta: { cellClassName: "whitespace-normal max-w-[240px]" },
        cell: ({ row }) => {
          const description = row.original.description;
          if (!description) {
            return <span className="text-[11px] text-muted-foreground">—</span>;
          }
          return (
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="text-[11px] leading-snug text-muted-foreground line-clamp-2 whitespace-normal">
                    {description}
                  </div>
                }
              />
              <TooltipContent className="max-w-sm whitespace-normal">
                {description}
              </TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        id: "assignedTeam",
        accessorFn: (row) => row.assignedTeam?.name ?? "Unassigned",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Assigned to <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ row }) => {
          const a = row.original;
          return (
            <button
              type="button"
              onClick={() => callbacks.onEditAssignment(a)}
              className="inline-flex min-w-[120px] max-w-full items-center rounded-md border border-transparent px-2 py-1 text-left transition-colors hover:border-border/60 hover:bg-muted/50"
            >
              {a.assignedTeam ? (
                <TeamBadge team={a.assignedTeam} />
              ) : (
                <span className="text-xs text-muted-foreground">Unassigned</span>
              )}
            </button>
          );
        },
      },
      {
        accessorKey: "code",
        header: "URL",
        cell: ({ row }) => {
          return <CodeCell astronaut={row.original} callbacks={callbacks} />;
        },
      },
      {
        id: "claimedTeam",
        accessorFn: (row) => row.claimedTeam?.name ?? "Unclaimed",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Claimed <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ row }) => {
          const astronaut = row.original;
          const claimedTeam = astronaut.claimedTeam;
          return (
            <button
              type="button"
              onClick={() => callbacks.onEditClaim(astronaut)}
              className="inline-flex min-w-[92px] max-w-full items-center rounded-md border border-transparent px-2 py-1 text-left transition-colors hover:border-border/60 hover:bg-muted/50"
            >
              {claimedTeam ? (
                <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-blue-400">
                  <ShieldCheck className="size-3 shrink-0" />
                  <TeamBadge team={claimedTeam} />
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Unclaimed</span>
              )}
            </button>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const a = row.original;
          return (
            <div className="flex items-center gap-0.5">
              <IconActionButton
                label={a.previewUrl ? "Replace image" : "Upload image"}
                onClick={() => callbacks.onEditImage(a)}
              >
                <ImagePlus className="size-3.5" />
              </IconActionButton>
              <IconActionButton
                label={a.active ? "Deactivate" : "Activate"}
                onClick={() => callbacks.onToggleActive(a.id)}
              >
                <Power className="size-3.5" />
              </IconActionButton>
              <IconActionButton
                label="Delete"
                variant="destructive"
                onClick={() => callbacks.onDelete(a.id, a.name)}
              >
                <Trash2 className="size-3.5" />
              </IconActionButton>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [callbacks],
  );
}

// ---------------------------------------------------------------------------
// Data table
// ---------------------------------------------------------------------------

function DataTable({ data, callbacks }: { data: Astronaut[]; callbacks: ColumnCallbacks }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const columns = useColumns(callbacks);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredData = useMemo(() => {
    if (!normalizedSearch) return data;
    return data.filter((astronaut) =>
      [
        astronaut.name,
        astronaut.description,
        astronaut.hint,
        astronaut.code,
        astronaut.active ? "active" : "inactive",
        astronaut.assignedTeam?.name ?? "unassigned",
        astronaut.claimedTeam?.name ?? "unclaimed",
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [data, normalizedSearch]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Astronaut roster</h2>
          <p className="text-xs text-muted-foreground">
            Showing {filteredData.length} of {data.length} astronauts
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search table..."
            className="h-9 pl-8 text-sm"
            aria-label="Search astronauts"
          />
        </div>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {data.length === 0 ? "No astronauts yet." : "No astronauts match that search."}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row, idx) => (
              <motion.tr
                key={row.id}
                className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: idx * 0.03 }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={
                      (cell.column.columnDef.meta as { cellClassName?: string } | undefined)
                        ?.cellClassName
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </motion.tr>
            ))
          )}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminAstronautsPage() {
  const queryClient = useQueryClient();
  const listQuery = useQuery(trpc.astronaut.list.queryOptions());
  const teamsQuery = useQuery(trpc.team.list.queryOptions());

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hint, setHint] = useState("");
  const [editingAssignment, setEditingAssignment] = useState<Astronaut | null>(null);
  const [editingClaim, setEditingClaim] = useState<Astronaut | null>(null);
  const [editingImage, setEditingImage] = useState<Astronaut | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: trpc.astronaut.list.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.assignment.list.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.team.list.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.activity.validateSetup.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.leaderboard.getCurrent.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.leaderboard.getFinal.queryKey() });
  };

  const createMutation = useMutation({
    ...trpc.astronaut.create.mutationOptions(),
    onSuccess: (data) => {
      setName("");
      setDescription("");
      setHint("");
      invalidateAll();
      if (data.aiFallbackUsed) {
        toast.warning(
          "Astronaut created with a preset profile — AI generation is temporarily unavailable.",
        );
      } else {
        toast.success("Astronaut created");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    ...trpc.astronaut.toggleActive.mutationOptions(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: trpc.astronaut.list.queryKey() }),
    onError: (err) => toast.error(err.message),
  });

  const setClaimedByTeamMutation = useMutation({
    ...trpc.astronaut.setClaimedByTeam.mutationOptions(),
    onSuccess: () => {
      toast.success("Claimed status updated");
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateCodeMutation = useMutation({
    ...trpc.astronaut.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Astronaut code updated");
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    ...trpc.astronaut.delete.mutationOptions(),
    onSuccess: () => {
      setDeleteTarget(null);
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const assignMutation = useMutation({
    ...trpc.assignment.assign.mutationOptions(),
    onSuccess: invalidateAll,
    onError: (err) => toast.error(err.message),
  });

  const unassignMutation = useMutation({
    ...trpc.assignment.unassign.mutationOptions(),
    onSuccess: invalidateAll,
    onError: (err) => toast.error(err.message),
  });

  const [imageUploadPending, setImageUploadPending] = useState(false);

  async function uploadAstronautImage(astronautId: string, file: File) {
    setImageUploadPending(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(
        `${env.NEXT_PUBLIC_SERVER_URL}/api/astronauts/${astronautId}/upload`,
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
      toast.success("Astronaut image uploaded");
      invalidateAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
      throw error;
    } finally {
      setImageUploadPending(false);
    }
  }

  const appBaseUrl =
    typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "";

  const teams: TeamInfo[] = (teamsQuery.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    icon: t.icon,
  }));

  const astronauts: Astronaut[] = (listQuery.data ?? []).map((a) => {
    const assignment = a.assignments[0];
    return {
      id: a.id,
      name: a.name,
      description: a.description,
      hint: a.hint,
      previewUrl: a.previewUrl,
      code: a.code,
      active: a.active,
      assignedTeam: assignment?.team
        ? {
            id: assignment.team.id,
            name: assignment.team.name,
            color: assignment.team.color,
            icon: assignment.team.icon,
          }
        : null,
      claimedTeam: a.claims[0]?.team
        ? {
            id: a.claims[0].team.id,
            name: a.claims[0].team.name,
            color: a.claims[0].team.color,
            icon: a.claims[0].team.icon,
          }
        : null,
    };
  });
  const assignedCount = astronauts.filter((astronaut) => astronaut.assignedTeam).length;
  const claimedCount = astronauts.filter((astronaut) => astronaut.claimedTeam).length;
  const activeCount = astronauts.filter((astronaut) => astronaut.active).length;
  const unassignedCount = astronauts.length - assignedCount;
  const unclaimedCount = astronauts.length - claimedCount;
  const teamStats: TeamStats[] = teams.map((team) => ({
    ...team,
    assignedCount: astronauts.filter((astronaut) => astronaut.assignedTeam?.id === team.id)
      .length,
    claimedCount: astronauts.filter((astronaut) => astronaut.claimedTeam?.id === team.id)
      .length,
  }));

  const callbacks = useMemo<ColumnCallbacks>(
    () => ({
      appBaseUrl,
      onCopyUrl: (scanUrl) => {
        navigator.clipboard.writeText(scanUrl);
        toast.success("URL copied");
      },
      onToggleActive: (id) => toggleActiveMutation.mutate({ id }),
      onUpdateCode: (id, code) => updateCodeMutation.mutate({ id, code }),
      onDelete: (id, astronautName) => setDeleteTarget({ id, name: astronautName }),
      onEditAssignment: setEditingAssignment,
      onEditClaim: setEditingClaim,
      onEditImage: setEditingImage,
      isUpdatingCode: updateCodeMutation.isPending,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appBaseUrl, updateCodeMutation.isPending],
  );

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.header variants={fadeInUp}>
        <h1 className="text-2xl font-bold">Astronauts</h1>
        <p className="text-sm text-muted-foreground">
          Create astronauts and assign them to teams. Copy scan URLs onto NFC tags.
        </p>
      </motion.header>

      <motion.div className="space-y-3" variants={staggerContainer}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <StatTile label="Astronauts" value={astronauts.length} icon={UsersRound} />
          <StatTile label="Active" value={activeCount} icon={Power} />
          <StatTile label="Assigned" value={assignedCount} icon={Orbit} />
          <StatTile label="Claimed" value={claimedCount} icon={Check} />
          <StatTile label="Unassigned" value={unassignedCount} icon={X} />
          <StatTile label="Unclaimed" value={unclaimedCount} icon={ShieldCheck} />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {teamStats.map((team) => (
            <TeamStatCard key={team.id} team={team} />
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card className="p-4">
          <form
            className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                name: name || undefined,
                description: description || undefined,
                hint: hint || undefined,
              });
            }}
          >
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="AI-generated if empty"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="AI-generated if empty"
              />
            </div>
            <div>
              <Label htmlFor="hint">Hint</Label>
              <Input id="hint" value={hint} onChange={(e) => setHint(e.target.value)} />
            </div>
            <motion.div {...buttonInteraction}>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Add astronaut"}
              </Button>
            </motion.div>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Leave name or description empty to auto-generate with AI.
          </p>
        </Card>
      </motion.div>

      <motion.div variants={scaleIn}>
        <Card className="p-0">
          {listQuery.isPending ? (
            <p className="p-4 text-sm text-muted-foreground">Loading...</p>
          ) : (
            <DataTable data={astronauts} callbacks={callbacks} />
          )}
        </Card>
      </motion.div>

      {editingAssignment && (
        <AssignTeamDialog
          key={editingAssignment.id}
          astronaut={editingAssignment}
          teams={teams}
          open={!!editingAssignment}
          onOpenChange={(open) => {
            if (!open) setEditingAssignment(null);
          }}
          onAssign={(astronautId, teamId) => assignMutation.mutate({ astronautId, teamId })}
          onUnassign={(astronautId, teamId) => unassignMutation.mutate({ astronautId, teamId })}
          isPending={assignMutation.isPending || unassignMutation.isPending}
        />
      )}

      {editingClaim && (
        <ClaimedStatusDialog
          key={editingClaim.id}
          astronaut={editingClaim}
          teams={teams}
          open={!!editingClaim}
          onOpenChange={(open) => {
            if (!open) setEditingClaim(null);
          }}
          onSetClaimedByTeam={(astronautId, teamId) =>
            setClaimedByTeamMutation.mutate({ id: astronautId, teamId })
          }
          isPending={setClaimedByTeamMutation.isPending}
        />
      )}

      {editingImage && (
        <AstronautImageDialog
          key={editingImage.id}
          astronaut={editingImage}
          open={!!editingImage}
          onOpenChange={(open) => {
            if (!open) setEditingImage(null);
          }}
          onUpload={uploadAstronautImage}
          isPending={imageUploadPending}
        />
      )}

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
            <DialogTitle>Delete astronaut?</DialogTitle>
            <DialogDescription>
              Delete astronaut &ldquo;{deleteTarget?.name}&rdquo;? This cannot be undone.
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
              onClick={() => {
                if (!deleteTarget) return;
                deleteMutation.mutate({ id: deleteTarget.id });
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
