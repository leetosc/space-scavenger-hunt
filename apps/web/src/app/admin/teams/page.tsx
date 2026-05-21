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
import { cn } from "@space-scavenger-hunt/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ICON_MAP, SPACE_ICONS } from "@/lib/icons";
import { trpc } from "@/utils/trpc";

const DEFAULT_TEAMS = [
  { name: "Moonwalkers", color: "#5b8def", icon: "Moon" },
  { name: "Rocket Scientists", color: "#ef5b8d", icon: "Rocket" },
  { name: "Orbit Squad", color: "#5bef9c", icon: "Orbit" },
  { name: "Red Dwarfs", color: "#ef9c5b", icon: "Flame" },
];

const PRESET_COLORS = [
  { hex: "#5b8def", label: "Nebula Blue" },
  { hex: "#ef5b8d", label: "Solar Flare" },
  { hex: "#5bef9c", label: "Aurora Green" },
  { hex: "#ef9c5b", label: "Mars Orange" },
  { hex: "#a855f7", label: "Pulsar Purple" },
  { hex: "#f59e0b", label: "Stardust Gold" },
  { hex: "#06b6d4", label: "Comet Cyan" },
  { hex: "#f43f5e", label: "Red Giant" },
];

function ColorPicker({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (color: string) => void;
  id?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((preset) => {
          const isSelected = value.toLowerCase() === preset.hex.toLowerCase();
          return (
            <button
              key={preset.hex}
              type="button"
              title={preset.label}
              aria-label={preset.label}
              onClick={() => onChange(preset.hex)}
              className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1"
              style={{
                backgroundColor: preset.hex,
                borderColor: isSelected ? "white" : "transparent",
                boxShadow: isSelected ? `0 0 0 2px ${preset.hex}` : "none",
              }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-14 cursor-pointer p-0.5"
        />
        <span className="text-xs text-muted-foreground font-mono">{value}</span>
      </div>
    </div>
  );
}

function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {SPACE_ICONS.map(({ name, icon: Icon }) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          className={cn(
            "flex items-center justify-center p-1.5 border transition-all",
            "hover:border-cyan-400 hover:text-cyan-400",
            value === name
              ? "border-cyan-400 text-cyan-400 bg-cyan-400/10 shadow-[0_0_12px_rgba(34,211,238,0.25)]"
              : "border-border/40 text-muted-foreground",
          )}
          title={name}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

function TeamIcon({
  icon,
  color,
  name,
  className,
}: {
  icon: string | null;
  color: string | null;
  name: string;
  className?: string;
}) {
  const IconComponent = icon ? ICON_MAP[icon] : null;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded text-white",
        className ?? "h-8 w-8 text-xs font-bold",
      )}
      style={{ backgroundColor: color ?? "#888" }}
    >
      {IconComponent ? <IconComponent className="size-4" /> : name.slice(0, 1)}
    </span>
  );
}

type Team = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  _count: { players: number; assignments: number; claims: number };
};

function EditTeamDialog({
  team,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: {
  team: Team;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (data: { id: string; name?: string; icon?: string; color?: string }) => void;
  onDelete: (id: string) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}) {
  const [name, setName] = useState(team.name);
  const [icon, setIcon] = useState(team.icon ?? "Rocket");
  const [color, setColor] = useState(team.color ?? "#888888");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit team</DialogTitle>
          <DialogDescription>
            Update the team name, icon, and color.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Icon</Label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
          <div>
            <Label className="mb-1.5 block">Color</Label>
            <ColorPicker id="edit-color" value={color} onChange={setColor} />
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            onClick={() => {
              if (confirm(`Delete team "${team.name}"? Players assigned to it will be unassigned.`)) {
                onDelete(team.id);
                onOpenChange(false);
              }
            }}
          >
            Delete
          </Button>
          <Button
            size="sm"
            disabled={isUpdating}
            onClick={() => {
              onUpdate({ id: team.id, name, icon, color });
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminTeamsPage() {
  const queryClient = useQueryClient();
  const listQuery = useQuery(trpc.team.list.queryOptions());

  const createMutation = useMutation({
    ...trpc.team.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.team.list.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.activity.validateSetup.queryKey() });
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    ...trpc.team.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.team.list.queryKey() });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    ...trpc.team.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.team.list.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.activity.validateSetup.queryKey() });
    },
    onError: (err) => toast.error(err.message),
  });

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#5b8def");
  const [newIcon, setNewIcon] = useState("Rocket");
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const teams = listQuery.data ?? [];
  const canCreate = teams.length < 4;

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-sm text-muted-foreground">
            Exactly 4 teams are required. Players are assigned during kickoff.
          </p>
        </div>
        {teams.length < 4 ? (
          <Button
            type="button"
            variant="outline"
            disabled={createMutation.isPending}
            onClick={async () => {
              for (const t of DEFAULT_TEAMS.slice(teams.length, 4)) {
                await createMutation.mutateAsync({ name: t.name, color: t.color, icon: t.icon });
              }
              toast.success("Seeded default teams");
            }}
          >
            Seed default teams
          </Button>
        ) : null}
      </header>

      <Card className="p-4">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canCreate) return;
            createMutation.mutate({ name: newName, color: newColor, icon: newIcon });
            setNewName("");
          }}
        >
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Icon</Label>
            <IconPicker value={newIcon} onChange={setNewIcon} />
          </div>
          <div>
            <Label className="mb-1.5 block">Color</Label>
            <ColorPicker id="color" value={newColor} onChange={setNewColor} />
          </div>
          <Button type="submit" disabled={!canCreate || createMutation.isPending} className="w-full">
            {canCreate ? "Create team" : "4 / 4"}
          </Button>
        </form>
      </Card>

      <Card className="p-4">
        <h2 className="font-bold mb-2">Existing teams</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teams yet.</p>
        ) : (
          <ul className="divide-y">
            {teams.map((team) => (
              <li key={team.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <TeamIcon icon={team.icon} color={team.color} name={team.name} />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{team.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {team._count.players} players · {team._count.assignments} astronauts · {team._count.claims} claims
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingTeam(team)}
                >
                  <Pencil className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editingTeam && (
        <EditTeamDialog
          key={editingTeam.id}
          team={editingTeam}
          open={!!editingTeam}
          onOpenChange={(open) => { if (!open) setEditingTeam(null); }}
          onUpdate={(data) => updateMutation.mutate(data)}
          onDelete={(id) => deleteMutation.mutate({ id })}
          isUpdating={updateMutation.isPending}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
