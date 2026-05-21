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
import { AnimatePresence, motion } from "framer-motion";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { IconPicker } from "@/components/icon-picker";
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
            <motion.button
              key={preset.hex}
              type="button"
              title={preset.label}
              aria-label={preset.label}
              onClick={() => onChange(preset.hex)}
              className="h-6 w-6 rounded-full border-2 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-1"
              style={{
                backgroundColor: preset.hex,
                borderColor: isSelected ? "white" : "transparent",
                boxShadow: isSelected ? `0 0 0 2px ${preset.hex}` : "none",
              }}
              {...iconButtonInteraction}
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

        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeInUp}>
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <Label className="mb-1.5 block">Icon</Label>
            <IconPicker value={icon} onChange={setIcon} />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <Label className="mb-1.5 block">Color</Label>
            <ColorPicker id="edit-color" value={color} onChange={setColor} />
          </motion.div>
        </motion.div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <motion.div {...buttonInteraction}>
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
          </motion.div>
          <motion.div {...buttonInteraction}>
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
          </motion.div>
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
    <motion.div
      className="space-y-6 max-w-3xl"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.header
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        variants={fadeInUp}
      >
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-sm text-muted-foreground">
            Exactly 4 teams are required. Players are assigned during kickoff.
          </p>
        </div>
        {teams.length < 4 ? (
          <motion.div {...buttonInteraction}>
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
          </motion.div>
        ) : null}
      </motion.header>

      <motion.div variants={scaleIn}>
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
            <motion.div {...buttonInteraction}>
              <Button type="submit" disabled={!canCreate || createMutation.isPending} className="w-full">
                {canCreate ? "Create team" : "4 / 4"}
              </Button>
            </motion.div>
          </form>
        </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card className="p-4">
          <h2 className="font-bold mb-2">Existing teams</h2>
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams yet.</p>
          ) : (
            <ul className="divide-y">
              <AnimatePresence>
                {teams.map((team, idx) => (
                  <motion.li
                    key={team.id}
                    className="flex items-center justify-between gap-3 py-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ ...springTransition, delay: idx * 0.05 }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <TeamIcon icon={team.icon} color={team.color} name={team.name} />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{team.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {team._count.players} players · {team._count.assignments} astronauts · {team._count.claims} claims
                        </p>
                      </div>
                    </div>
                    <motion.div {...iconButtonInteraction}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingTeam(team)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </motion.div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Card>
      </motion.div>

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
    </motion.div>
  );
}
