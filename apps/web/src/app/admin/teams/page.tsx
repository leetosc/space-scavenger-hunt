"use client";

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
import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@space-scavenger-hunt/ui/components/collapsible";
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
import {
  ChevronDown,
  Orbit,
  Pencil,
  Plus,
  RadioTower,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
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
  { name: "Nova Navigators", color: "#a855f7", icon: "Compass" },
  { name: "Comet Crew", color: "#f59e0b", icon: "Sparkles" },
  { name: "Star Sailors", color: "#06b6d4", icon: "Star" },
  { name: "Meteor Makers", color: "#f43f5e", icon: "Satellite" },
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
  signalBoostBalance: number;
  signalBoostsUsed: number;
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
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
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
              onClick={() => setDeleteOpen(true)}
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

    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete team?</AlertDialogTitle>
          <AlertDialogDescription>
            Delete team &ldquo;{team.name}&rdquo;? Players assigned to it will be unassigned.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={() => {
              onDelete(team.id);
              onOpenChange(false);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

export default function AdminTeamsPage() {
  const queryClient = useQueryClient();
  const listQuery = useQuery(trpc.team.list.queryOptions());
  const configQuery = useQuery(trpc.team.getConfig.queryOptions());

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
  const [createFormOpen, setCreateFormOpen] = useState(true);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const teams = listQuery.data ?? [];
  const maxTeams = configQuery.data?.maxTeams ?? 4;
  const canCreate = teams.length < maxTeams;
  const totalPlayers = teams.reduce((sum, team) => sum + team._count.players, 0);
  const totalAssignments = teams.reduce((sum, team) => sum + team._count.assignments, 0);
  const totalClaims = teams.reduce((sum, team) => sum + team._count.claims, 0);
  const setupPercent = Math.round((teams.length / maxTeams) * 100);
  const createFormVisible = canCreate && createFormOpen;

  useEffect(() => {
    if (!canCreate) setCreateFormOpen(false);
  }, [canCreate]);

  return (
    <motion.div
      className="space-y-6 max-w-6xl"
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
            <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
            Team grid command
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
          <p className="text-sm text-muted-foreground">
            Fleet configuration requires <span className="font-mono text-cyan-300">{maxTeams}</span> teams before
            kickoff assignment.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-3 border border-cyan-400/20 bg-slate-950/50 text-center shadow-[0_0_24px_rgba(34,211,238,0.08)]">
            {[
              ["Teams", `${teams.length}/${maxTeams}`],
              ["Crew", totalPlayers.toString()],
              ["Claims", totalClaims.toString()],
            ].map(([label, value]) => (
              <div key={label} className="min-w-24 border-r border-cyan-400/15 px-3 py-2 last:border-r-0">
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/70">
                  {label}
                </div>
                <div className="mt-1 truncate font-mono text-xs font-bold text-slate-100">{value}</div>
              </div>
            ))}
          </div>
          {canCreate ? (
            <motion.div {...buttonInteraction}>
              <Button
                type="button"
                variant="outline"
                disabled={createMutation.isPending}
                className="h-10 border-cyan-400/30 bg-cyan-400/10 text-xs font-bold uppercase tracking-wide text-cyan-100 hover:bg-cyan-400/20"
                onClick={async () => {
                  for (let i = teams.length; i < maxTeams; i++) {
                    const t = DEFAULT_TEAMS[i % DEFAULT_TEAMS.length]!;
                    await createMutation.mutateAsync({
                      name: i < DEFAULT_TEAMS.length ? t.name : `${t.name} ${i + 1}`,
                      color: t.color,
                      icon: t.icon,
                    });
                  }
                  toast.success("Seeded default teams");
                }}
              >
                <Sparkles data-icon="inline-start" className="size-4" />
                Seed defaults
              </Button>
            </motion.div>
          ) : null}
        </div>
      </motion.header>

      <motion.div variants={scaleIn}>
        <Card className="overflow-hidden border-cyan-400/25 bg-slate-950/55 p-0 shadow-[0_0_30px_rgba(34,211,238,0.08)] backdrop-blur">
          <Collapsible
            open={createFormVisible}
            onOpenChange={(open) => {
              if (canCreate) setCreateFormOpen(open);
            }}
          >
          <div className="border-b border-cyan-400/15 bg-[linear-gradient(90deg,rgba(34,211,238,0.14),rgba(15,23,42,0.6),rgba(132,204,22,0.08))] px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center border border-cyan-400/35 bg-cyan-400/10 text-cyan-300 shadow-[inset_0_0_18px_rgba(34,211,238,0.12)]">
                  <RadioTower className="size-4" />
                </div>
                <div>
                  <h2 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-slate-100">
                    Team Configuration
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {canCreate
                      ? "Register team identity, symbol, and beacon color."
                      : `Maximum team grid reached (${maxTeams}).`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 border border-cyan-400/20 bg-slate-950/70 px-2.5 py-1.5 text-xs">
                  <span className="text-muted-foreground">Grid sync</span>
                  <span className="font-mono font-semibold text-cyan-300">{setupPercent}%</span>
                </div>
                <CollapsibleTrigger
                  type="button"
                  disabled={!canCreate}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 border border-cyan-400/25 bg-slate-950/70 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100 transition-colors hover:bg-cyan-400/10 focus:outline-none focus:ring-2 focus:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                  aria-label={createFormVisible ? "Collapse team creation form" : "Expand team creation form"}
                >
                  {createFormVisible ? "Collapse" : "Create"}
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      createFormVisible ? "rotate-180" : "rotate-0",
                    )}
                  />
                </CollapsibleTrigger>
              </div>
            </div>
          </div>
          <CollapsibleContent>
            <form
              className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr] xl:grid-cols-[1fr_1.15fr_1fr_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                if (!canCreate) return;
                createMutation.mutate({ name: newName, color: newColor, icon: newIcon });
                setNewName("");
              }}
            >
              <div className="border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]">
                <Label htmlFor="name" className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75">
                  Team name
                </Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  placeholder="Enter call sign"
                  className="mt-2 font-mono"
                />
              </div>
              <div className="border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]">
                <Label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75">
                  Signal icon
                </Label>
                <IconPicker value={newIcon} onChange={setNewIcon} />
              </div>
              <div className="border border-cyan-400/15 bg-slate-900/45 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.8)]">
                <Label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/75">
                  Beacon color
                </Label>
                <ColorPicker id="color" value={newColor} onChange={setNewColor} />
              </div>
              <motion.div className="flex items-end" {...buttonInteraction}>
                <Button
                  type="submit"
                  disabled={!canCreate || createMutation.isPending}
                  className="h-10 w-full justify-center"
                >
                  <Plus data-icon="inline-start" className="size-4" />
                  {canCreate ? "Create team" : `${maxTeams} / ${maxTeams}`}
                </Button>
              </motion.div>
            </form>
          </CollapsibleContent>
          </Collapsible>
        </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card className="relative overflow-hidden border-cyan-400/20 bg-slate-950/50 p-0 shadow-[0_0_28px_rgba(34,211,238,0.07)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.05)_1px,transparent_1px)] bg-[length:100%_12px]" />
          <div className="relative flex flex-col gap-3 border-b border-cyan-400/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300/75">
                Fleet roster
              </p>
              <h2 className="mt-1 text-sm font-bold uppercase tracking-wide">Existing teams</h2>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <span className="border border-cyan-400/15 bg-slate-900/60 px-2 py-1">
                {totalAssignments} astronauts
              </span>
              <span className="border border-cyan-400/15 bg-slate-900/60 px-2 py-1">
                {setupPercent}% ready
              </span>
            </div>
          </div>
          {teams.length === 0 ? (
            <p className="relative px-4 py-5 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              No team beacons registered.
            </p>
          ) : (
            <ul className="relative grid gap-3 p-4 lg:grid-cols-2">
              <AnimatePresence>
                {teams.map((team, idx) => (
                  <motion.li
                    key={team.id}
                    className="overflow-hidden border border-cyan-400/15 bg-slate-900/55 shadow-[0_0_24px_rgba(15,23,42,0.4)]"
                    style={{
                      borderColor: team.color ? `${team.color}55` : undefined,
                      boxShadow: team.color ? `0 0 24px ${team.color}18` : undefined,
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ ...springTransition, delay: idx * 0.05 }}
                  >
                    <div className="border-b border-white/10 bg-slate-950/50 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <TeamIcon
                            icon={team.icon}
                            color={team.color}
                            name={team.name}
                            className="h-10 w-10 text-sm shadow-[0_0_18px_rgba(255,255,255,0.08)]"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold uppercase tracking-wide text-slate-100">
                              {team.name}
                            </p>
                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                              Team vector {String(idx + 1).padStart(2, "0")}
                            </p>
                          </div>
                        </div>
                        <motion.div {...iconButtonInteraction}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingTeam(team)}
                            className="text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-100"
                            aria-label={`Edit ${team.name}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-y divide-white/10 sm:grid-cols-5 sm:divide-y-0">
                      {[
                        ["Crew", team._count.players, UsersRound],
                        ["Astronauts", team._count.assignments, Orbit],
                        ["Claims", team._count.claims, ShieldCheck],
                        ["Boosts left", team.signalBoostBalance, Sparkles],
                        ["Boosts used", team.signalBoostsUsed, RadioTower],
                      ].map(([label, value, Icon]) => {
                        const StatIcon = Icon as typeof UsersRound;
                        return (
                          <div key={label as string} className="px-3 py-3">
                            <div className="mb-1 flex items-center gap-1.5 text-cyan-300/70">
                              <StatIcon className="size-3.5" />
                              <span className="font-mono text-[9px] uppercase tracking-[0.16em]">
                                {label as string}
                              </span>
                            </div>
                            <div className="font-mono text-lg font-bold text-slate-100">
                              {value as number}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="h-1 bg-slate-800">
                      <div
                        className="h-full bg-cyan-300"
                        style={{
                          width: `${Math.min(100, team._count.players * 20)}%`,
                          backgroundColor: team.color ?? undefined,
                        }}
                      />
                    </div>
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
