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
import { ArrowUpDown, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { IconPicker } from "@/components/icon-picker";
import { ICON_MAP } from "@/lib/icons";
import { trpc } from "@/utils/trpc";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Player = {
  id: string;
  name: string;
  icon: string | null;
  teamId: string | null;
  isCheckedIn: boolean;
  team: { id: string; name: string; color: string | null; icon: string | null } | null;
  authUser: { id: string; username: string | null; role: string } | null;
};

// ---------------------------------------------------------------------------
// Edit dialog
// ---------------------------------------------------------------------------

function EditPlayerDialog({
  player,
  teams,
  open,
  onOpenChange,
}: {
  player: Player;
  teams: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const [name, setName] = useState(player.name);
  const [icon, setIcon] = useState(player.icon ?? "Rocket");
  const [teamId, setTeamId] = useState<string | null>(player.teamId);
  const [isCheckedIn, setIsCheckedIn] = useState(player.isCheckedIn);
  const [role, setRole] = useState<"PLAYER" | "ADMIN">(
    (player.authUser?.role as "PLAYER" | "ADMIN") ?? "PLAYER",
  );

  const updateMutation = useMutation({
    ...trpc.player.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.player.list.queryKey() });
      toast.success(`Updated "${name}"`);
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    ...trpc.player.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.player.list.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.activity.validateSetup.queryKey() });
      toast.success(`Deleted "${player.name}"`);
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit player</DialogTitle>
          <DialogDescription>
            @{player.authUser?.username ?? "no-account"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="edit-player-name">Display name</Label>
            <Input
              id="edit-player-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Icon */}
          <div>
            <Label className="mb-1.5 block">Icon</Label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>

          {/* Team */}
          <div>
            <Label htmlFor="edit-player-team" className="mb-1.5 block">Team</Label>
            <select
              id="edit-player-team"
              value={teamId ?? ""}
              onChange={(e) => setTeamId(e.target.value || null)}
              className="flex h-8 w-full items-center border border-input bg-transparent px-2.5 py-1.5 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring/50 dark:bg-input/30"
            >
              <option value="">No team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role */}
          {player.authUser && (
            <div>
              <Label htmlFor="edit-player-role" className="mb-1.5 block">Role</Label>
              <select
                id="edit-player-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "PLAYER" | "ADMIN")}
                className="flex h-8 w-full items-center border border-input bg-transparent px-2.5 py-1.5 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring/50 dark:bg-input/30"
              >
                <option value="PLAYER">Player</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          )}

          {/* Checked in */}
          <div className="flex items-center gap-2">
            <input
              id="edit-player-checkin"
              type="checkbox"
              checked={isCheckedIn}
              onChange={(e) => setIsCheckedIn(e.target.checked)}
              className="accent-cyan-400"
            />
            <Label htmlFor="edit-player-checkin" className="text-sm font-normal">
              Checked in
            </Label>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm(`Delete player "${player.name}"? This also removes their auth account.`)) {
                deleteMutation.mutate({ id: player.id });
              }
            }}
          >
            Delete
          </Button>
          <Button
            size="sm"
            disabled={updateMutation.isPending}
            onClick={() => {
              updateMutation.mutate({
                id: player.id,
                name,
                icon,
                teamId,
                isCheckedIn,
                ...(player.authUser ? { role } : {}),
              });
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

function useColumns(onEdit: (player: Player) => void) {
  return useMemo<ColumnDef<Player>[]>(
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
          const p = row.original;
          const Icon = p.icon ? ICON_MAP[p.icon] : null;
          return (
            <div className="flex items-center gap-2">
              {Icon && <Icon className="size-4 text-cyan-400 shrink-0" />}
              <div className="min-w-0">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  @{p.authUser?.username ?? "—"}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "team.name",
        header: "Team",
        cell: ({ row }) => {
          const team = row.original.team;
          if (!team) return <span className="text-muted-foreground">—</span>;
          const Icon = team.icon ? ICON_MAP[team.icon] : null;
          return (
            <div className="flex items-center gap-1.5">
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
              <span className="truncate">{team.name}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "authUser.role",
        header: "Role",
        cell: ({ row }) => {
          const role = row.original.authUser?.role;
          const isAdmin = role === "ADMIN";
          return (
            <span
              className={cn(
                "text-[11px] px-1.5 py-0.5 rounded-sm border",
                isAdmin
                  ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                  : "border-border/40 text-muted-foreground",
              )}
            >
              {isAdmin ? "Admin" : "Player"}
            </span>
          );
        },
      },
      {
        accessorKey: "isCheckedIn",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={cn(
              "text-[11px] px-1.5 py-0.5 rounded-sm border",
              row.original.isCheckedIn
                ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                : "border-border/40 text-muted-foreground",
            )}
          >
            {row.original.isCheckedIn ? "Checked in" : "Not checked in"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button size="sm" variant="ghost" onClick={() => onEdit(row.original)}>
            <Pencil className="size-3.5" />
          </Button>
        ),
        enableSorting: false,
      },
    ],
    [onEdit],
  );
}

// ---------------------------------------------------------------------------
// Data table
// ---------------------------------------------------------------------------

function DataTable({ data, onEdit }: { data: Player[]; onEdit: (p: Player) => void }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useColumns(onEdit);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
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
              No players yet.
            </TableCell>
          </TableRow>
        ) : (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminPlayersPage() {
  const queryClient = useQueryClient();
  const listQuery = useQuery(trpc.player.list.queryOptions());
  const teamsQuery = useQuery(trpc.team.list.queryOptions());

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [editing, setEditing] = useState<Player | null>(null);

  const createMutation = useMutation({
    ...trpc.player.create.mutationOptions(),
    onSuccess: () => {
      toast.success(`Created player "${name}"`);
      setName("");
      setUsername("");
      setPassword("");
      queryClient.invalidateQueries({ queryKey: trpc.player.list.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.activity.validateSetup.queryKey() });
    },
    onError: (err) => toast.error(err.message),
  });

  const players: Player[] = (listQuery.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    icon: p.icon,
    teamId: p.teamId,
    isCheckedIn: p.isCheckedIn,
    team: p.team
      ? { id: p.team.id, name: p.team.name, color: p.team.color, icon: p.team.icon }
      : null,
    authUser: p.authUser ?? null,
  }));

  const teams = (teamsQuery.data ?? []).map((t) => ({ id: t.id, name: t.name }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Players</h1>
        <p className="text-sm text-muted-foreground">
          Manage player accounts. Share username and password so they can sign in.
        </p>
      </header>

      {/* Create form */}
      <Card className="p-4">
        <form
          className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({ name, username, password });
          }}
        >
          <div>
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={1}
            />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
              minLength={3}
              pattern="^[a-z0-9_.-]+$"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Add player"}
          </Button>
        </form>
      </Card>

      {/* Table */}
      <Card className="p-0">
        {listQuery.isPending ? (
          <p className="p-4 text-sm text-muted-foreground">Loading...</p>
        ) : (
          <DataTable data={players} onEdit={setEditing} />
        )}
      </Card>

      {/* Edit dialog */}
      {editing && (
        <EditPlayerDialog
          key={editing.id}
          player={editing}
          teams={teams}
          open={!!editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      )}
    </div>
  );
}
