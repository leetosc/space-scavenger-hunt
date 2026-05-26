"use client";

import { env } from "@space-scavenger-hunt/env/web";
import { Card } from "@space-scavenger-hunt/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { RadioTower, Rocket, Satellite, UserRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { fadeInUp, popIn, scaleIn, staggerContainer } from "@/lib/animations";
import { ICON_MAP } from "@/lib/icons";
import { trpc } from "@/utils/trpc";

function getSignupUrl() {
  const baseUrl = env.NEXT_PUBLIC_SERVER_URL.replace(/\/$/, "");
  return `${baseUrl}/signup?next=${encodeURIComponent("/waiting")}`;
}

function PlayerIcon({ icon, name }: { icon: string | null; name: string }) {
  const Icon = icon ? ICON_MAP[icon] : null;

  return (
    <div className="flex size-14 shrink-0 items-center justify-center border border-cyan-300/35 bg-cyan-300/10 text-cyan-200 shadow-[inset_0_0_22px_rgba(34,211,238,0.16)]">
      {Icon ? (
        <Icon className="size-7" />
      ) : (
        <span className="text-lg font-bold">{name.slice(0, 1)}</span>
      )}
    </div>
  );
}

export default function JoinDisplayPage() {
  const signupUrl = getSignupUrl();
  const joinState = useQuery({
    ...trpc.player.getJoinDisplayState.queryOptions(),
    refetchInterval: 1500,
    meta: { suppressErrorToast: true },
  });

  const readyCount = joinState.data?.readyCount ?? 0;
  const players = joinState.data?.players ?? [];

  return (
    <main className="flex min-h-full w-full flex-col overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
      <motion.div
        className="mx-auto grid h-full min-h-[calc(100svh-5rem)] w-full max-w-[1600px] gap-5 lg:grid-cols-[minmax(320px,430px)_1fr]"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.aside
          className="relative overflow-hidden border border-cyan-400/25 bg-slate-950/70 p-4 shadow-[0_0_42px_rgba(34,211,238,0.12)] backdrop-blur"
          variants={fadeInUp}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px)] bg-[length:100%_18px,18px_100%]" />
          <div className="relative flex h-full flex-col gap-3">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">
                <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
                Crew check-in
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-slate-100">
                Join the Mission
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Scan the code, create your astronaut profile, and watch for your
                signal on the ready board.
              </p>
            </div>

            <motion.div
              className="mx-auto w-full max-w-[260px] border border-cyan-400/25 bg-white p-3 shadow-[0_0_34px_rgba(34,211,238,0.2)]"
              variants={scaleIn}
            >
              <QRCodeSVG
                value={signupUrl}
                size={320}
                bgColor="#ffffff"
                fgColor="#020617"
                level="H"
                marginSize={2}
                className="h-auto w-full"
              />
            </motion.div>

            <div className="grid grid-cols-2 border border-cyan-400/20 bg-slate-950/60 text-center">
              <div className="border-r border-cyan-400/15 px-3 py-3">
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/70">
                  Ready
                </div>
                <div className="mt-1 font-mono text-4xl font-black text-slate-100">
                  {readyCount}
                </div>
              </div>
              <div className="px-3 py-3">
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/70">
                  Status
                </div>
                <div className="mt-3 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase text-emerald-300">
                  <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
                  Open
                </div>
              </div>
            </div>

            <div className="mt-auto space-y-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <div className="flex items-center gap-2 border border-cyan-400/15 bg-slate-900/55 px-3 py-2">
                <Rocket className="size-3.5 text-cyan-300" />
                Team assignment starts after check-in
              </div>
            </div>
          </div>
        </motion.aside>

        <motion.section
          className="relative min-h-[520px] overflow-hidden border border-cyan-400/20 bg-slate-950/50 shadow-[0_0_34px_rgba(15,23,42,0.55)] backdrop-blur"
          variants={fadeInUp}
        >
          <div className="border-b border-cyan-400/15 bg-[linear-gradient(90deg,rgba(34,211,238,0.14),rgba(15,23,42,0.6),rgba(132,204,22,0.08))] px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center border border-cyan-400/35 bg-cyan-400/10 text-cyan-300">
                  <RadioTower className="size-5" />
                </div>
                <div>
                  <h2 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-slate-100">
                    Ready Crew
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Players appear here after signup.
                  </p>
                </div>
              </div>
              <div className="inline-flex h-9 w-24 items-center justify-center gap-2 border border-cyan-400/20 bg-slate-950/70 px-3 font-mono text-xs uppercase tracking-[0.16em] text-cyan-200">
                <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
                Live
              </div>
            </div>
          </div>

          {players.length === 0 ? (
            <motion.div
              className="flex h-[calc(100%-73px)] min-h-[430px] flex-col items-center justify-center gap-4 px-6 text-center"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
            >
              <div className="flex size-20 items-center justify-center border border-cyan-400/25 bg-cyan-400/10 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.15)]">
                <UserRound className="size-9" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-100">
                  Awaiting first crew signal
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  The ready board will fill as players complete signup.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="grid max-h-[calc(100svh-10rem)] gap-3 overflow-y-auto p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence>
                {players.map((player) => (
                  <motion.div
                    key={player.id}
                    layout
                    variants={popIn}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, scale: 0.94 }}
                  >
                    <Card className="h-full overflow-hidden border-cyan-400/20 bg-slate-900/60 p-3 shadow-[inset_0_0_18px_rgba(15,23,42,0.85)]">
                      <div className="flex min-w-0 items-center gap-3">
                        <PlayerIcon icon={player.icon} name={player.name} />
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-bold text-slate-100">
                            {player.name}
                          </h3>
                          <p className="mt-1 truncate font-mono text-xs uppercase tracking-[0.14em] text-cyan-300">
                            @{player.username ?? "crew"}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.section>
      </motion.div>
    </main>
  );
}
