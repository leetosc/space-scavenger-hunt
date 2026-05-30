"use client";

import { Badge } from "@space-scavenger-hunt/ui/components/badge";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { cn } from "@space-scavenger-hunt/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Radar, Satellite, UserRoundSearch } from "lucide-react";
import Image from "next/image";

import Loader from "@/components/loader";
import { fadeIn, fadeInUp, scaleIn, staggerContainer } from "@/lib/animations";
import { trpc } from "@/utils/trpc";

const DEFAULT_ASTRONAUT_IMAGE = "/astronautIcon.png";

type AstronautStatus = "missing" | "found";

function StatusBadge({ status }: { status: AstronautStatus }) {
  const isFound = status === "found";

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-none border px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.18em]",
        isFound
          ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.08)]"
          : "border-amber-300/35 bg-amber-300/10 text-amber-100 shadow-[0_0_18px_rgba(252,211,77,0.08)]",
      )}
    >
      <span
        className={cn(
          "mr-1.5 h-1.5 w-1.5 rounded-full",
          isFound ? "bg-emerald-300" : "bg-amber-300",
        )}
      />
      {status}
    </Badge>
  );
}

export default function AstronautsPage() {
  const astronautsQuery = useQuery({
    ...trpc.astronaut.listGallery.queryOptions(),
    refetchInterval: 10000,
  });

  const astronauts = astronautsQuery.data ?? [];
  const foundCount = astronauts.filter(
    (astronaut) => astronaut.status === "found",
  ).length;
  const missingCount = astronauts.length - foundCount;

  if (astronautsQuery.isPending) {
    return (
      <div className="flex min-h-full w-full items-center justify-center px-6 py-16 text-center">
        <div className="space-y-4">
          <Loader />
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300/80">
            Loading crew manifest...
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.main
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 md:py-12"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.header
        className="relative overflow-hidden border border-cyan-400/20 bg-slate-950/55 p-5 shadow-[0_0_45px_rgba(6,182,212,0.08)] backdrop-blur-md sm:p-6"
        variants={fadeInUp}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-indigo-400/0 via-cyan-300/70 to-fuchsia-400/0" />
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full border border-cyan-300/10" />
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full border border-indigo-300/10" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">
              <Satellite className="size-3.5" />
              Crew Manifest
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black leading-tight tracking-normal text-slate-50 drop-shadow-[0_0_24px_rgba(34,211,238,0.14)] sm:text-5xl">
                Astronauts
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Track the stranded Starfarer-9 crew and monitor which signals
                still need a rescue team response.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-80">
            <div className="border border-slate-700/60 bg-slate-900/55 p-3">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-slate-400">
                Total
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-50">
                {astronauts.length}
              </p>
            </div>
            <div className="border border-amber-300/25 bg-amber-300/10 p-3">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-amber-100/70">
                Missing
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-100">
                {missingCount}
              </p>
            </div>
            <div className="border border-emerald-300/25 bg-emerald-300/10 p-3">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-emerald-100/70">
                Found
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-100">
                {foundCount}
              </p>
            </div>
          </div>
        </div>
      </motion.header>

      {astronauts.length === 0 ? (
        <motion.div
          className="flex flex-1 items-center justify-center py-16"
          variants={fadeIn}
        >
          <Card className="max-w-md rounded-none border-cyan-400/20 bg-slate-900/60 p-6 text-center shadow-[0_0_40px_rgba(6,182,212,0.08)] backdrop-blur-md">
            <Radar className="mx-auto size-8 text-cyan-300" />
            <h2 className="mt-4 text-xl font-bold text-slate-50">
              No active astronauts detected
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              The crew manifest is quiet for now. Check back once mission
              control activates the roster.
            </p>
          </Card>
        </motion.div>
      ) : (
        <motion.section
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
        >
          {astronauts.map((astronaut) => (
            <motion.article key={astronaut.id} variants={scaleIn}>
              <Card className="group relative h-full overflow-hidden rounded-none border-cyan-400/20 bg-slate-900/60 p-0 shadow-[0_0_34px_rgba(6,182,212,0.06)] backdrop-blur-md transition-colors hover:border-cyan-300/45">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-300/0 via-cyan-300/60 to-indigo-300/0 opacity-70" />
                <div className="relative aspect-[4/3] overflow-hidden border-b border-cyan-400/15 bg-slate-950/80">
                  <Image
                    src={astronaut.previewUrl ?? DEFAULT_ASTRONAUT_IMAGE}
                    alt={`${astronaut.name} portrait`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                    unoptimized={!!astronaut.previewUrl}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent" />
                </div>

                <div className="space-y-3 p-4">
                  <StatusBadge status={astronaut.status as AstronautStatus} />
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold leading-snug text-slate-50">
                        {astronaut.name}
                      </h2>
                      <p className="mt-1 line-clamp-5 text-xs leading-relaxed text-slate-400">
                        {astronaut.description ||
                          "No additional crew telemetry is available yet."}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.article>
          ))}
        </motion.section>
      )}
    </motion.main>
  );
}
