"use client";

import type { AppRouter } from "@space-scavenger-hunt/api/routers/index";
import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { Input } from "@space-scavenger-hunt/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import { toast } from "sonner";
import { SELFIE_STATUS, selfiePhotoUrl } from "@/lib/birthday-selfies";
import { trpc } from "@/utils/trpc";

type Selfie = inferRouterOutputs<AppRouter>["selfie"]["adminList"][number];
function ReviewCard({ selfie }: { selfie: Selfie }) {
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: trpc.selfie.adminList.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.hint.adminList.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.hint.adminLedger.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.team.list.queryKey() });
  };
  const approve = useMutation({ ...trpc.selfie.approve.mutationOptions(), onSuccess: () => { toast.success("Selfie approved."); invalidate(); }, onError: e => toast.error(e.message) });
  const reject = useMutation({ ...trpc.selfie.reject.mutationOptions(), onSuccess: () => { toast.success("Selfie rejected; reward reversed."); setReason(""); invalidate(); }, onError: e => toast.error(e.message) });
  const pending = approve.isPending || reject.isPending;
  return <Card className="space-y-3 border-cyan-400/20 bg-slate-950/60 p-4">
    <div><h2 className="font-bold">{selfie.player.name} with {selfie.twin === "LUKE" ? "Luke" : "Leo"}</h2><p className="text-sm text-muted-foreground">{selfie.team.name} · {new Date(selfie.createdAt).toLocaleString()}</p></div>
    {selfie.imageBlobName ? <a href={selfiePhotoUrl(selfie.id)} target="_blank" rel="noreferrer"><img src={selfiePhotoUrl(selfie.id)} crossOrigin="use-credentials" alt={`${selfie.player.name}'s birthday selfie`} loading="lazy" className="aspect-[4/3] w-full rounded bg-slate-900 object-contain" /></a> : <p>No photo received.</p>}
    <p className="font-semibold text-cyan-200">{SELFIE_STATUS[selfie.status]}</p>
    <p className="text-sm">AI: {selfie.aiPassed === null ? "Not completed" : selfie.aiPassed ? "Passed" : "Failed"}{selfie.aiConfidence !== null ? ` (${Math.round(selfie.aiConfidence * 100)}%)` : ""}</p>
    {selfie.aiFeedback ? <p className="text-sm text-muted-foreground">{selfie.aiFeedback}</p> : null}
    {selfie.credit ? <p className="text-sm text-emerald-200">Boost: {selfie.credit.state.toLowerCase()}{selfie.credit.locationHint ? ` · ${selfie.credit.locationHint.title || "Untitled location hint"}` : ""}</p> : null}
    {selfie.rejectionReason ? <p className="text-sm text-amber-200">Admin: {selfie.rejectionReason}</p> : null}
    {selfie.reviewedAt ? <p className="text-xs text-muted-foreground">Reviewed {new Date(selfie.reviewedAt).toLocaleString()}</p> : null}
    {selfie.reviews.length ? <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Review history</summary><ul className="mt-2 space-y-1">{selfie.reviews.map(review => <li key={review.id}>{new Date(review.createdAt).toLocaleString()} · {review.decision.toLowerCase()} · {review.reviewerId}{review.reason ? `: ${review.reason}` : ""}</li>)}</ul></details> : null}
    {selfie.status !== "REJECTED" && selfie.status !== "UPLOAD_FAILED" ? <div className="space-y-2 border-t border-white/10 pt-3">
      {selfie.status !== "APPROVED" || !selfie.reviewedBy ? <Button className="w-full" disabled={pending || !selfie.imageBlobName} onClick={() => approve.mutate({ id: selfie.id })}>{selfie.status === "APPROVED" ? "Confirm approval" : "Approve & award boost"}</Button> : null}
      <label htmlFor={`reason-${selfie.id}`} className="text-xs text-muted-foreground">Rejection reason</label>
      <Input id={`reason-${selfie.id}`} value={reason} maxLength={300} onChange={e => setReason(e.target.value)} placeholder="e.g. Wrong twin or player not in photo" />
      <Button className="w-full" variant="destructive" disabled={pending || !reason.trim()} onClick={() => reject.mutate({ id: selfie.id, reason })}>{reject.isPending ? "Rejecting…" : "Reject selfie"}</Button>
      {selfie.credit?.state === "SPENT" ? <p className="text-xs text-muted-foreground">Rejection reverses its hint reveal step unless an admin has since overridden that hint.</p> : null}
    </div> : null}
  </Card>;
}

export default function AdminSelfiesPage() {
  const [filter, setFilter] = useState("ALL");
  const selfies = useQuery({ ...trpc.selfie.adminList.queryOptions(), refetchInterval: 5000 });
  const rows = selfies.data?.filter(s => filter === "ALL" || (filter === "REVIEW" ? !s.reviewedBy && ["PROCESSING", "PENDING_REVIEW", "AI_REJECTED", "APPROVED"].includes(s.status) : s.status === filter));
  return <main className="max-w-6xl space-y-6">
    <header><h1 className="text-2xl font-bold">Birthday Selfies</h1><p className="mt-2 text-sm text-muted-foreground">AI-approved selfies earn boosts immediately. Review the selected twin and player here; rejection revokes the reward.</p></header>
    <div className="flex flex-wrap gap-2">{[["ALL", "All photos"], ["REVIEW", "Needs review"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"]].map(([value, label]) => <Button key={value} variant={filter === value ? "default" : "outline"} aria-pressed={filter === value} onClick={() => setFilter(value!)}>{label}</Button>)}</div>
    {selfies.isPending ? <p role="status">Loading photos…</p> : selfies.error ? <p role="alert">{selfies.error.message}</p> : rows?.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map(selfie => <ReviewCard key={selfie.id} selfie={selfie} />)}</div> : <p className="text-muted-foreground">No selfies in this view yet.</p>}
  </main>;
}
