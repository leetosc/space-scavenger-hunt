"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
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
import { ArrowUpDown, Power, RefreshCw, Trash2 } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";

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
  teams: TeamInfo[];
  appBaseUrl: string;
  onCopyUrl: (scanUrl: string) => void;
  onRegenerateCode: (id: string) => void;
  onToggleActive: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onAssign: (astronautId: string, teamId: string) => void;
  onUnassign: (astronautId: string, teamId: string) => void;
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
          <Button
            type="button"
            size="icon-sm"
            variant={variant}
            aria-label={label}
            onClick={onClick}
          >
            {children}
          </Button>
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
            <select
              value={a.assignedTeam?.id ?? ""}
              onChange={(e) => {
                const teamId = e.target.value;
                if (teamId) {
                  callbacks.onAssign(a.id, teamId);
                } else if (a.assignedTeam) {
                  callbacks.onUnassign(a.id, a.assignedTeam.id);
                }
              }}
              className="h-7 w-full min-w-[120px] border border-input bg-transparent px-2 py-1 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring/50 dark:bg-input/30"
            >
              <option value="">Unassigned</option>
              {callbacks.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
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
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => callbacks.onCopyUrl(scanUrl)}
              >
                Copy
              </Button>
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
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
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
              </TableRow>
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
      teams,
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
      onAssign: (astronautId, teamId) => assignMutation.mutate({ astronautId, teamId }),
      onUnassign: (astronautId, teamId) => unassignMutation.mutate({ astronautId, teamId }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appBaseUrl, teams],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Astronauts</h1>
        <p className="text-sm text-muted-foreground">
          Create astronauts and assign them to teams. Copy scan URLs onto NFC tags.
        </p>
      </header>

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
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Add astronaut"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          Leave name or description empty to auto-generate with AI.
        </p>
      </Card>

      <Card className="p-0">
        {listQuery.isPending ? (
          <p className="p-4 text-sm text-muted-foreground">Loading...</p>
        ) : (
          <DataTable data={astronauts} callbacks={callbacks} />
        )}
      </Card>
    </div>
  );
}
