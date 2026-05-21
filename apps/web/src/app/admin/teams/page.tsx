"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { Input } from "@space-scavenger-hunt/ui/components/input";
import { Label } from "@space-scavenger-hunt/ui/components/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

const DEFAULT_TEAMS = [
  { name: "Moonwalkers", color: "#5b8def", icon: "M" },
  { name: "Rocket Scientists", color: "#ef5b8d", icon: "R" },
  { name: "Orbit Squad", color: "#5bef9c", icon: "O" },
  { name: "Red Dwarfs", color: "#ef9c5b", icon: "D" },
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
      {/* Preset swatches */}
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
      {/* Custom color input */}
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
  const [newIcon, setNewIcon] = useState("M");

  const teams = listQuery.data ?? [];
  const canCreate = teams.length < 4;

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="flex items-center justify-between">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                maxLength={4}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={!canCreate || createMutation.isPending} className="w-full">
                {canCreate ? "Create team" : "4 / 4"}
              </Button>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Color</Label>
            <ColorPicker id="color" value={newColor} onChange={setNewColor} />
          </div>
        </form>
      </Card>

      <Card className="p-4">
        <h2 className="font-bold mb-2">Existing teams</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teams yet.</p>
        ) : (
          <ul className="divide-y">
            {teams.map((team) => (
              <li key={team.id} className="py-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded text-xs font-bold text-white"
                      style={{ backgroundColor: team.color ?? "#888" }}
                    >
                      {team.icon ?? team.name.slice(0, 1)}
                    </span>
                    <div>
                      <p className="font-medium">{team.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {team._count.players} players · {team._count.assignments} astronauts ·{" "}
                        {team._count.claims} claims
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const name = prompt("New name", team.name);
                        if (name && name !== team.name) {
                          updateMutation.mutate({ id: team.id, name });
                        }
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (
                          confirm(
                            `Delete team "${team.name}"? Players assigned to it will be unassigned.`,
                          )
                        ) {
                          deleteMutation.mutate({ id: team.id });
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                {/* Inline color picker for existing teams */}
                <div className="pl-11">
                  <p className="text-xs text-muted-foreground mb-1.5">Team color</p>
                  <ColorPicker
                    value={team.color ?? "#888888"}
                    onChange={(color) => updateMutation.mutate({ id: team.id, color })}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
