"use client";

import type { AppRouter } from "@space-scavenger-hunt/api/routers/index";
import { MAX_FUN_FACT_LENGTH } from "@space-scavenger-hunt/api/constants/fun-fact";
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
import { Badge } from "@space-scavenger-hunt/ui/components/badge";
import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@space-scavenger-hunt/ui/components/dialog";
import { Label } from "@space-scavenger-hunt/ui/components/label";
import { Textarea } from "@space-scavenger-hunt/ui/components/textarea";
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
import type { inferRouterOutputs } from "@trpc/server";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  CheckCircle2,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  buttonInteraction,
  fadeInUp,
  scaleIn,
  staggerContainer,
  springTransition,
} from "@/lib/animations";
import { trpc } from "@/utils/trpc";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type AdminData = RouterOutputs["funFact"]["adminList"];
type Player = AdminData["players"][number];
type Challenge = AdminData["challenges"][number];

const STATUS_OPTIONS = ["ACTIVE", "SKIPPED", "CORRECT", "EXHAUSTED"] as const;

function statusClass(status: string) {
  if (status === "CORRECT") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (status === "EXHAUSTED") return "border-red-400/30 bg-red-400/10 text-red-200";
  if (status === "SKIPPED") return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
}

function PlayerFactsDialog({
  player,
  open,
  onOpenChange,
}: {
  player: Player;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [factOne, setFactOne] = useState(player.funFacts[0]?.text ?? "");
  const [factTwo, setFactTwo] = useState(player.funFacts[1]?.text ?? "");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: trpc.funFact.adminList.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.player.list.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.activity.validateSetup.queryKey() });
  };

  const updateFacts = useMutation({
    ...trpc.funFact.adminUpdatePlayerFacts.mutationOptions(),
    onSuccess: () => {
      toast.success("Fun facts updated");
      invalidate();
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
  });
  const clearFacts = useMutation({
    ...trpc.funFact.adminClearPlayerFacts.mutationOptions(),
    onSuccess: () => {
      toast.success("Fun facts cleared");
      invalidate();
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
  });
  const ready = useMutation({
    ...trpc.funFact.adminSetPlayerReady.mutationOptions(),
    onSuccess: () => {
      toast.success("Readiness updated");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const facts = [factOne.trim(), factTwo.trim()];
  const canSave =
    facts.every((fact) => fact.length > 0 && fact.length <= MAX_FUN_FACT_LENGTH) &&
    facts[0]?.toLowerCase() !== facts[1]?.toLowerCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit fun facts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2 border border-cyan-400/15 bg-slate-950/50 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold text-slate-100">{player.name}</p>
                <p className="text-xs text-muted-foreground">
                  @{player.authUser?.username ?? "no-account"} / {player.team?.name ?? "No team"}
                </p>
              </div>
              <Badge className={cn("rounded-sm", statusClass(player.isCheckedIn ? "CORRECT" : "EXHAUSTED"))}>
                {player.isCheckedIn ? "Ready" : "Not ready"}
              </Badge>
            </div>
          </div>
          {[factOne, factTwo].map((value, index) => (
            <div key={index}>
              <Label htmlFor={`admin-fact-${player.id}-${index}`}>
                Fun fact {index + 1}
              </Label>
              <Textarea
                id={`admin-fact-${player.id}-${index}`}
                value={value}
                maxLength={MAX_FUN_FACT_LENGTH}
                rows={3}
                onChange={(event) =>
                  index === 0 ? setFactOne(event.target.value) : setFactTwo(event.target.value)
                }
                className="mt-2 resize-none"
              />
              <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">
                {value.length}/{MAX_FUN_FACT_LENGTH}
              </p>
            </div>
          ))}
        </div>
        <DialogFooter className="flex-row flex-wrap justify-between gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={clearFacts.isPending}
              onClick={() => clearFacts.mutate({ playerId: player.id })}
            >
              <Trash2 className="size-3.5" />
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={ready.isPending}
              onClick={() =>
                ready.mutate({ playerId: player.id, isCheckedIn: !player.isCheckedIn })
              }
            >
              {player.isCheckedIn ? (
                <XCircle className="size-3.5" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              {player.isCheckedIn ? "Mark incomplete" : "Mark ready"}
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!canSave || updateFacts.isPending}
            onClick={() => updateFacts.mutate({ playerId: player.id, facts })}
          >
            <Pencil className="size-3.5" />
            Save facts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChallengeRow({ challenge }: { challenge: Challenge }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: trpc.funFact.adminList.queryKey() });

  const reset = useMutation({
    ...trpc.funFact.adminResetChallenge.mutationOptions(),
    onSuccess: () => {
      toast.success("Challenge reset");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const setStatus = useMutation({
    ...trpc.funFact.adminSetChallengeStatus.mutationOptions(),
    onSuccess: () => {
      toast.success("Challenge status updated");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <TableRow>
      <TableCell>
        <div className="min-w-0">
          <p className="font-semibold">{challenge.team.name}</p>
          <p className="text-xs text-muted-foreground">
            last guess {challenge.lastGuessedPlayer?.name ?? "none"}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <p className="max-w-sm truncate text-sm">{challenge.playerFunFact.text}</p>
        <p className="text-xs text-muted-foreground">
          Owner: {challenge.playerFunFact.player.name}
          {challenge.playerFunFact.player.team
            ? ` / ${challenge.playerFunFact.player.team.name}`
            : ""}
        </p>
      </TableCell>
      <TableCell>
        <select
          value={challenge.status}
          disabled={setStatus.isPending}
          onChange={(event) =>
            setStatus.mutate({
              challengeId: challenge.id,
              status: event.target.value as (typeof STATUS_OPTIONS)[number],
            })
          }
          className="h-8 border border-input bg-background px-2 text-xs"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </TableCell>
      <TableCell className="font-mono text-xs">{challenge.attemptsUsed}</TableCell>
      <TableCell>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={reset.isPending}
          onClick={() => reset.mutate({ challengeId: challenge.id })}
        >
          <RefreshCw className="size-3.5" />
          Reset
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function AdminFunFactsPage() {
  const queryClient = useQueryClient();
  const adminList = useQuery(trpc.funFact.adminList.queryOptions());
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: trpc.funFact.adminList.queryKey() });

  const resetTeam = useMutation({
    ...trpc.funFact.adminResetTeam.mutationOptions(),
    onSuccess: () => {
      toast.success("Team challenge history reset");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const resetFact = useMutation({
    ...trpc.funFact.adminResetFact.mutationOptions(),
    onSuccess: () => {
      toast.success("Fact attempts reset");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const clearChallenges = useMutation({
    ...trpc.funFact.adminClearChallenges.mutationOptions(),
    onSuccess: () => {
      toast.success("All challenge history cleared");
      invalidate();
      setClearAllOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const data = adminList.data;
  const stats = useMemo(() => {
    const players = data?.players ?? [];
    const complete = players.filter(
      (player) => player.isCheckedIn && player.funFacts.length >= 2,
    ).length;
    return { players: players.length, complete };
  }, [data?.players]);

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.header
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        variants={fadeInUp}
      >
        <div>
          <div className="mb-2 inline-flex items-center gap-2 border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300">
            <Sparkles className="size-3.5" />
            Bonus signals
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Fun Facts</h1>
          <p className="text-sm text-muted-foreground">
            Manage onboarding facts and team Signal Boost challenge progress.
          </p>
        </div>
        <Button
          type="button"
          variant="destructive"
          disabled={!data?.challenges.length}
          onClick={() => setClearAllOpen(true)}
        >
          <Trash2 className="size-4" />
          Clear challenge history
        </Button>
      </motion.header>

      <motion.div className="grid gap-3 sm:grid-cols-3" variants={fadeInUp}>
        {[
          ["Players", stats.players],
          ["Onboarded", stats.complete],
          ["Challenges", data?.challenges.length ?? 0],
        ].map(([label, value]) => (
          <Card
            key={label}
            className="rounded-none border-cyan-400/20 bg-slate-950/55 p-4"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-100">{value}</p>
          </Card>
        ))}
      </motion.div>

      <motion.div variants={scaleIn}>
        <Card className="overflow-hidden rounded-none border-cyan-400/20 bg-slate-950/55 p-0">
          <div className="border-b border-cyan-400/15 px-4 py-3">
            <h2 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-slate-100">
              Player onboarding
            </h2>
          </div>
          {!data ? (
            <p className="p-4 text-sm text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Facts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.players.map((player, index) => (
                  <motion.tr
                    key={player.id}
                    className="border-b transition-colors hover:bg-muted/50"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springTransition, delay: index * 0.025 }}
                  >
                    <TableCell>
                      <p className="font-semibold">{player.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {player.team?.name ?? "No team"} / @
                        {player.authUser?.username ?? "no-account"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {player.funFacts.length === 0 ? (
                          <span className="text-xs text-muted-foreground">No facts</span>
                        ) : (
                          player.funFacts.map((fact) => (
                            <div
                              key={fact.id}
                              className="flex items-start justify-between gap-2 text-xs"
                            >
                              <span className="line-clamp-1">{fact.text}</span>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                disabled={resetFact.isPending}
                                title="Reset attempts for this fact"
                                onClick={() =>
                                  resetFact.mutate({ playerFunFactId: fact.id })
                                }
                              >
                                <RefreshCw className="size-3.5" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("rounded-sm", statusClass(player.isCheckedIn ? "CORRECT" : "EXHAUSTED"))}>
                        {player.isCheckedIn ? "Ready" : "Incomplete"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingPlayer(player)}
                      >
                        <Pencil className="size-3.5" />
                        Manage
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </motion.div>

      <motion.div variants={scaleIn}>
        <Card className="overflow-hidden rounded-none border-emerald-400/20 bg-slate-950/55 p-0">
          <div className="flex flex-col gap-3 border-b border-emerald-400/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-slate-100">
                Team challenge progress
              </h2>
              <p className="text-xs text-muted-foreground">
                View attempts, owners, guesses, and reset operational state.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {data?.teams.map((team) => (
                <Button
                  key={team.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={resetTeam.isPending}
                  onClick={() => resetTeam.mutate({ teamId: team.id })}
                >
                  Reset {team.name}
                </Button>
              ))}
            </div>
          </div>
          {!data ? (
            <p className="p-4 text-sm text-muted-foreground">Loading...</p>
          ) : data.challenges.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center text-muted-foreground">
              <Brain className="size-8 text-emerald-300" />
              <p className="font-mono text-xs uppercase tracking-[0.18em]">
                No challenge attempts yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Fun fact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {data.challenges.map((challenge) => (
                    <ChallengeRow key={challenge.id} challenge={challenge} />
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </Card>
      </motion.div>

      {editingPlayer ? (
        <PlayerFactsDialog
          key={editingPlayer.id}
          player={editingPlayer}
          open={!!editingPlayer}
          onOpenChange={(open) => {
            if (!open) setEditingPlayer(null);
          }}
        />
      ) : null}

      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all challenge history?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes every team&apos;s fun fact attempts and current
              challenge state. Player-submitted fun facts will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={clearChallenges.isPending}
              onClick={() => clearChallenges.mutate()}
            >
              Clear history
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
