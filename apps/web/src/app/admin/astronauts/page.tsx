"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { Input } from "@space-scavenger-hunt/ui/components/input";
import { Label } from "@space-scavenger-hunt/ui/components/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export default function AdminAstronautsPage() {
  const queryClient = useQueryClient();
  const listQuery = useQuery(trpc.astronaut.list.queryOptions());

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hint, setHint] = useState("");

  const createMutation = useMutation({
    ...trpc.astronaut.create.mutationOptions(),
    onSuccess: () => {
      setName("");
      setDescription("");
      setHint("");
      queryClient.invalidateQueries({ queryKey: trpc.astronaut.list.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.activity.validateSetup.queryKey() });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.astronaut.list.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.activity.validateSetup.queryKey() });
    },
    onError: (err) => toast.error(err.message),
  });

  const appBaseUrl =
    typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "";

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold">Astronauts</h1>
        <p className="text-sm text-muted-foreground">
          Create astronauts, copy the scan URL onto NFC tags, and hide them around the office.
        </p>
      </header>

      <Card className="p-4">
        <form
          className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({ name, description, hint });
          }}
        >
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
      </Card>

      <Card className="p-4">
        <h2 className="font-bold mb-2">Astronauts</h2>
        {!listQuery.data ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : listQuery.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="divide-y">
            {listQuery.data.map((a) => {
              const scanUrl = `${appBaseUrl}/scan/${a.code}`;
              const claimedBy = a.claims[0]?.team?.name;
              return (
                <li key={a.id} className="py-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{a.name}</p>
                      <span
                        className={`text-xs rounded px-2 py-0.5 ${a.active ? "bg-green-500/15 text-green-700" : "bg-muted text-muted-foreground"}`}
                      >
                        {a.active ? "active" : "inactive"}
                      </span>
                      {claimedBy ? (
                        <span className="text-xs rounded px-2 py-0.5 bg-blue-500/15 text-blue-700">
                          claimed by {claimedBy}
                        </span>
                      ) : null}
                    </div>
                    {a.description ? (
                      <p className="text-sm text-muted-foreground">{a.description}</p>
                    ) : null}
                    <div className="flex items-center gap-2 text-xs">
                      <code className="bg-muted px-2 py-0.5 rounded">{a.code}</code>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(scanUrl);
                          toast.success("Scan URL copied");
                        }}
                      >
                        Copy scan URL
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground break-all">{scanUrl}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => regenerateMutation.mutate({ id: a.id })}
                    >
                      New code
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActiveMutation.mutate({ id: a.id })}
                    >
                      {a.active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm(`Delete astronaut "${a.name}"?`)) {
                          deleteMutation.mutate({ id: a.id });
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
