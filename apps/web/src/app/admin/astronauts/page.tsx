"use client";

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
import { ArrowUpDown, Power, RefreshCw, Trash2 } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
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
  code: string;
  active: boolean;
  assignedTeam: TeamInfo | null;
  claimedBy: string | null;
};

type ColumnCallbacks = {
  appBaseUrl: string;
  onCopyUrl: (scanUrl: string) => void;
  onRegenerateCode: (id: string) => void;
  onToggleActive: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onEditAssignment: (astronaut: Astronaut) => void;
};

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
        header: "Assigned to",
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
          const a = row.original;
          const scanUrl = `${callbacks.appBaseUrl}/astronaut/${a.code}`;
          return (
            <div className="flex items-center gap-2">
              <code className="bg-muted px-2 py-0.5 rounded text-xs shrink-0">{a.code}</code>
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
            </div>
          );
        },
      },
      {
        accessorKey: "claimedBy",
        header: "Claimed",
        cell: ({ row }) => {
          const claimedBy = row.original.claimedBy;
          if (!claimedBy) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-[11px] px-1.5 py-0.5 rounded-sm border border-blue-500/40 text-blue-400 bg-blue-500/10">
              {claimedBy}
            </span>
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
                label="New code"
                onClick={() => callbacks.onRegenerateCode(a.id)}
              >
                <RefreshCw className="size-3.5" />
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
  const columns = useColumns(callbacks);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <TooltipProvider>
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
                No astronauts yet.
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

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: trpc.astronaut.list.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.assignment.list.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.team.list.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.activity.validateSetup.queryKey() });
  };

  const createMutation = useMutation({
    ...trpc.astronaut.create.mutationOptions(),
    onSuccess: () => {
      setName("");
      setDescription("");
      setHint("");
      invalidateAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const regenerateMutation = useMutation({
    ...trpc.astronaut.generateCode.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.astronaut.list.queryKey() });
      toast.success("Code regenerated");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    ...trpc.astronaut.toggleActive.mutationOptions(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: trpc.astronaut.list.queryKey() }),
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    ...trpc.astronaut.delete.mutationOptions(),
    onSuccess: invalidateAll,
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
      code: a.code,
      active: a.active,
      assignedTeam: assignment?.team
        ? { id: assignment.team.id, name: assignment.team.name, color: assignment.team.color, icon: assignment.team.icon }
        : null,
      claimedBy: a.claims[0]?.team?.name ?? null,
    };
  });

  const callbacks = useMemo<ColumnCallbacks>(
    () => ({
      appBaseUrl,
      onCopyUrl: (scanUrl) => {
        navigator.clipboard.writeText(scanUrl);
        toast.success("URL copied");
      },
      onRegenerateCode: (id) => regenerateMutation.mutate({ id }),
      onToggleActive: (id) => toggleActiveMutation.mutate({ id }),
      onDelete: (id, astronautName) => {
        if (confirm(`Delete astronaut "${astronautName}"?`)) {
          deleteMutation.mutate({ id });
        }
      },
      onEditAssignment: setEditingAssignment,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appBaseUrl],
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
    </motion.div>
  );
}
