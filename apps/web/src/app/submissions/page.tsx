"use client";

import type { AppRouter } from "@space-scavenger-hunt/api/routers/index";
import { Badge } from "@space-scavenger-hunt/ui/components/badge";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@space-scavenger-hunt/ui/components/dialog";
import { cn } from "@space-scavenger-hunt/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { motion } from "framer-motion";
import { Camera, ImageOff, Radar, ShieldCheck, ShieldX } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { trpc } from "@/utils/trpc";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Submission = RouterOutputs["attempt"]["listCompleted"][number];

function statusMeta(status: string) {
  if (status === "APPROVED") {
    return {
      label: "Approved",
      icon: ShieldCheck,
      className: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
    };
  }

  return {
    label: "Rejected",
    icon: ShieldX,
    className: "border-rose-400/40 bg-rose-400/10 text-rose-200",
  };
}

function SubmissionCard({
  submission,
  onOpen,
}: {
  submission: Submission;
  onOpen: () => void;
}) {
  const meta = statusMeta(submission.status);
  const StatusIcon = meta.icon;

  return (
    <motion.article variants={fadeInUp}>
      <Card
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
          }
        }}
        className="group relative cursor-pointer overflow-hidden rounded-none border-cyan-400/20 bg-slate-950/75 p-0 shadow-[0_0_32px_rgba(6,182,212,0.07)] backdrop-blur-md transition-colors hover:border-cyan-300/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300/70"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
          {submission.previewUrl ? (
            <Image
              src={submission.previewUrl}
              alt={`${submission.team.name} submission for ${submission.astronaut.name}`}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
              <ImageOff className="size-8" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                No image signal
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/85 to-transparent" />
        </div>

        <div className="space-y-3 p-4">
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300">
              {submission.team.name}
            </p>
            <h2
              className="line-clamp-2 text-xs font-semibold leading-4 text-slate-100 sm:text-[13px]"
              title={submission.taskPrompt}
            >
              {submission.taskPrompt}
            </h2>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-cyan-400/10 pt-3 text-xs text-slate-400">
            <span className="min-w-0 truncate">{submission.astronaut.name}</span>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em]",
                meta.className,
              )}
            >
              <StatusIcon className="mr-1 size-3" />
              {meta.label}
            </Badge>
          </div>
        </div>
      </Card>
    </motion.article>
  );
}

function SubmissionDialog({
  submission,
  onOpenChange,
}: {
  submission: Submission | null;
  onOpenChange: (open: boolean) => void;
}) {
  const meta = submission ? statusMeta(submission.status) : null;
  const StatusIcon = meta?.icon;

  return (
    <Dialog open={submission !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-none border-cyan-400/20 bg-slate-950/95 p-0 text-slate-100 shadow-[0_0_60px_rgba(6,182,212,0.14)] backdrop-blur-xl sm:max-w-5xl">
        {submission && meta && StatusIcon ? (
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
            <div className="relative min-h-[320px] bg-slate-900 lg:min-h-[620px]">
              {submission.previewUrl ? (
                <Image
                  src={submission.previewUrl}
                  alt={`${submission.team.name} submission for ${submission.astronaut.name}`}
                  fill
                  sizes="(min-width: 1024px) 62vw, 100vw"
                  className="object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-slate-500">
                  <ImageOff className="size-10" />
                  <span className="font-mono text-xs uppercase tracking-[0.2em]">
                    No image signal
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-cyan-400/15 p-5 lg:border-l lg:border-t-0">
              <DialogHeader>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em]",
                      meta.className,
                    )}
                  >
                    <StatusIcon className="mr-1 size-3" />
                    {meta.label}
                  </Badge>
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300">
                    {submission.team.name}
                  </span>
                </div>
                <DialogTitle className="text-left text-xl font-black tracking-tight text-slate-50">
                  {submission.astronaut.name}
                </DialogTitle>
                <DialogDescription className="text-left text-sm leading-6 text-slate-400">
                  Completed attempt details from the mission feed.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 space-y-5">
                <section>
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Task
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-100">{submission.taskPrompt}</p>
                </section>

                {submission.aiFeedback ? (
                  <section>
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Review notes
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {submission.aiFeedback}
                    </p>
                  </section>
                ) : null}

                <dl className="grid gap-3 border-t border-cyan-400/10 pt-5 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      Team
                    </dt>
                    <dd className="text-right font-semibold text-slate-100">
                      {submission.team.name}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      Astronaut
                    </dt>
                    <dd className="text-right font-semibold text-slate-100">
                      {submission.astronaut.name}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      Status
                    </dt>
                    <dd className="text-right font-semibold text-slate-100">{meta.label}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function SubmissionsPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const submissions = useQuery({
    ...trpc.attempt.listCompleted.queryOptions(),
    enabled: !!session,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!sessionPending && !session) router.push("/login");
  }, [router, session, sessionPending]);

  if (sessionPending || (session && submissions.isPending)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-10 text-center">
        <Loader />
        <p className="text-sm text-muted-foreground">Loading submission gallery...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (submissions.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-center text-sm text-destructive">
          Could not load submissions. {submissions.error.message}
        </p>
      </div>
    );
  }

  const completed = submissions.data ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <header className="relative overflow-hidden border border-cyan-400/20 bg-slate-950/70 px-5 py-6 shadow-[0_0_45px_rgba(6,182,212,0.08)] backdrop-blur-md sm:px-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <div className="absolute -right-16 -top-24 h-56 w-56 rounded-full border border-cyan-300/10" />
        <div className="absolute -right-5 top-8 h-28 w-28 rounded-full border border-indigo-300/10" />
        <div className="relative space-y-3">
          <div className="inline-flex items-center gap-2 border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-200">
            <Radar className="size-3.5" />
            Completed transmissions
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-white via-cyan-100 to-indigo-200 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">
              Submission Gallery
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Review every completed photo challenge signal from the mission feed.
            </p>
          </div>
        </div>
      </header>

      {completed.length === 0 ? (
        <Card className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-none border-cyan-400/20 bg-slate-950/60 p-8 text-center shadow-[0_0_40px_rgba(6,182,212,0.06)] backdrop-blur-md">
          <Camera className="size-9 text-cyan-300" />
          <div>
            <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-slate-100">
              No completed submissions
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Approved and rejected attempts will appear here once mission control reviews them.
            </p>
          </div>
        </Card>
      ) : (
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {completed.map((submission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              onOpen={() => setSelectedSubmission(submission)}
            />
          ))}
        </motion.div>
      )}

      <SubmissionDialog
        submission={selectedSubmission}
        onOpenChange={(open) => {
          if (!open) setSelectedSubmission(null);
        }}
      />
    </div>
  );
}
