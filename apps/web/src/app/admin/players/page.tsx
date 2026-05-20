"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { Input } from "@space-scavenger-hunt/ui/components/input";
import { Label } from "@space-scavenger-hunt/ui/components/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export default function AdminPlayersPage() {
  const queryClient = useQueryClient();
  const listQuery = useQuery(trpc.player.list.queryOptions());

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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

  const deleteMutation = useMutation({
    ...trpc.player.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.player.list.queryKey() });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold">Players</h1>
        <p className="text-sm text-muted-foreground">
          Pre-create Better Auth accounts for each player. Share their username and password so they
          can sign in.
        </p>
      </header>

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

      <Card className="p-4">
        <h2 className="font-bold mb-2">Current players</h2>
        {!listQuery.data ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : listQuery.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No players yet.</p>
        ) : (
          <ul className="divide-y">
            {listQuery.data.map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    @{p.authUser?.username ?? "(no account)"} ·{" "}
                    {p.team ? `Team: ${p.team.name}` : "No team"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (confirm(`Delete player "${p.name}"?`)) {
                      deleteMutation.mutate({ id: p.id });
                    }
                  }}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
