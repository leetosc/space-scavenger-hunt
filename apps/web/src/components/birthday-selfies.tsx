"use client";

import type { AppRouter } from "@space-scavenger-hunt/api/routers/index";
import { env } from "@space-scavenger-hunt/env/web";
import { Button } from "@space-scavenger-hunt/ui/components/button";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { Camera, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import { SELFIE_STATUS, selfiePhotoUrl } from "@/lib/birthday-selfies";

type Submission = inferRouterOutputs<AppRouter>["selfie"]["mine"][number];

function SelfieCard({ twin, submissions, active }: { twin: "LUKE" | "LEO"; submissions: Submission[]; active: boolean }) {
  const name = twin === "LUKE" ? "Luke" : "Leo";
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<{ file: File; requestId: string } | null>(null);
  const [preview, setPreview] = useState<string>();
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const current = submissions.find(s => s.activeKey) ?? submissions[0];
  const locked = !!current?.activeKey;
  useEffect(() => {
    if (!selection) { setPreview(undefined); return; }
    const url = URL.createObjectURL(selection.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selection]);
  const upload = useMutation({
    mutationFn: async () => {
      if (!selection) throw new Error("Choose a photo first.");
      const body = new FormData();
      body.append("image", selection.file); body.append("twin", twin); body.append("requestId", selection.requestId);
      const response = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/selfies/upload`, { method: "POST", credentials: "include", body });
      const result = await response.json().catch(() => ({ message: "Upload failed. Check your connection and try again." }));
      if (!response.ok) {
        // A server failure is a completed attempt; a network failure retains its id for safe retry.
        setSelection(s => s ? { ...s, requestId: crypto.randomUUID() } : null);
        throw new Error(result.message || "Upload failed.");
      }
      return result as { status: string; feedback?: string };
    },
    onSuccess: result => {
      setSelection(null);
      if (result.status === "APPROVED") toast.success(`Selfie with ${name} approved! +1 team boost.`);
      else toast.info(result.feedback || SELFIE_STATUS[result.status] || "Photo received.");
    },
    onError: error => toast.error(error.message),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: trpc.selfie.mine.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.hint.listForTeam.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.team.getDashboard.queryKey() });
    },
  });
  function select(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("Choose a JPEG, PNG, or WebP photo."); return; }
    setSelection({ file, requestId: crypto.randomUUID() });
  }
  const image = preview ?? (current?.imageBlobName ? selfiePhotoUrl(current.id) : undefined);
  return (
    <Card className="overflow-hidden border-cyan-400/25 bg-slate-950/65 p-5">
      <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold">Selfie with {name}</h3><span className="text-xs text-emerald-300">+1 Boost</span></div>
      {image ? <img src={image} alt={`Selfie with ${name}`} crossOrigin={preview ? undefined : "use-credentials"} className="mt-4 aspect-[4/3] w-full rounded-lg object-contain bg-slate-900" /> :
        <div className="mt-4 flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-cyan-400/25 bg-cyan-400/5"><Camera className="size-12 text-cyan-300/60" /></div>}
      <div className="mt-4 space-y-3">
        <div aria-live="polite" className="space-y-1 text-sm">
          {current ? <p className={current.status === "APPROVED" ? "text-emerald-300" : "text-amber-200"}>{current.status === "APPROVED" ? <CheckCircle2 className="mr-1 inline size-4" /> : null}{SELFIE_STATUS[current.status]}</p> : <p className="text-muted-foreground">You and {name}, together in one photo.</p>}
          {current?.rejectionReason || current?.aiFeedback ? <p className="text-muted-foreground">{current.rejectionReason || current.aiFeedback}</p> : null}
          {current?.status === "REJECTED" ? <p className="text-muted-foreground">This reward was revoked. You can submit a replacement.</p> : null}
        </div>
        {!locked ? <>
          <input ref={camera} type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="hidden" aria-label={`Take selfie with ${name}`} onChange={e => { select(e.target.files?.[0]); e.target.value = ""; }} />
          <input ref={library} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label={`Choose selfie with ${name}`} onChange={e => { select(e.target.files?.[0]); e.target.value = ""; }} />
          <div className="flex gap-2"><Button variant="outline" className="flex-1" disabled={!active || upload.isPending} onClick={() => camera.current?.click()}>Take selfie</Button><Button variant="outline" className="flex-1" disabled={!active || upload.isPending} onClick={() => library.current?.click()}>Choose photo</Button></div>
          {selection ? <Button className="w-full" disabled={!active || upload.isPending} onClick={() => upload.mutate()}>{upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}{upload.isPending ? "Uploading & checking…" : `Submit selfie with ${name}`}</Button> : null}
        </> : null}
        {!active && !locked ? <p className="text-xs text-muted-foreground">Uploads open while the mission is active.</p> : null}
      </div>
    </Card>
  );
}

export default function BirthdaySelfies() {
  const selfies = useQuery({ ...trpc.selfie.mine.queryOptions(), refetchInterval: 5000 });
  const activity = useQuery({ ...trpc.activity.getState.queryOptions(), refetchInterval: 5000 });
  return <section className="space-y-4">
    <div><h2 className="flex items-center gap-2 text-xl font-bold"><Sparkles className="size-5 text-emerald-300" />Birthday bonus missions</h2><p className="mt-1 text-sm text-muted-foreground">Celebrate Luke &amp; Leo turning one! Earn one boost with each birthday boy, up to two per person. AI checks your photo; an admin may review it later.</p></div>
    {selfies.isPending ? <p role="status">Loading your selfies…</p> : selfies.error ? <p role="alert">{selfies.error.message}</p> : <div className="grid gap-4 md:grid-cols-2">{(["LUKE", "LEO"] as const).map(twin => <SelfieCard key={twin} twin={twin} submissions={selfies.data.filter(s => s.twin === twin)} active={activity.data?.status === "ACTIVE"} />)}</div>}
  </section>;
}
