"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@space-scavenger-hunt/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Compass,
  Orbit,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Terminal,
  Trophy,
  Users,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import {
  staggerContainer,
  fadeInUp,
  buttonInteraction,
  springTransition,
} from "@/lib/animations";
import { trpc } from "@/utils/trpc";

export default function Home() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const activity = useQuery({
    ...trpc.activity.getState.queryOptions(),
    refetchInterval: 5000,
  });

  const me = useQuery({
    ...trpc.player.me.queryOptions(),
    enabled: !!session,
  });

  const board = useQuery({
    ...trpc.leaderboard.getCurrent.queryOptions(),
    refetchInterval: 10000,
  });

  const handleEnterMission = () => {
    if (!session) {
      router.push("/login");
      return;
    }
    if (!activity.data || !me.data) return;
    if (me.data.user.role === "ADMIN") {
      router.push("/admin");
      return;
    }
    const status = activity.data.status;
    if (status === "ACTIVE" || status === "FINISHED") {
      router.push("/dashboard" as Route);
    } else {
      router.push("/waiting" as Route);
    }
  };

  const activityStatus = activity.data?.status || "STANDBY";

  const statusConfig = {
    ACTIVE: {
      label: "Live Operations Active",
      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      indicator: "bg-emerald-500",
    },
    FINISHED: {
      label: "Mission Completed",
      color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      indicator: "bg-blue-500",
    },
    STANDBY: {
      label: "System Standby",
      color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      indicator: "bg-amber-500",
    },
  }[activityStatus];

  if (sessionPending || activity.isPending) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center space-y-4">
          <Loader />
          <p className="text-sm font-mono tracking-widest text-cyan-500 animate-pulse">
            CONNECTING TO DEEP-SPACE TELEMETRY...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full w-full overflow-x-hidden flex flex-col justify-between">
      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 md:py-20 justify-center items-center gap-12 sm:gap-16">
        {/* Hero Header Section */}
        <div className="text-center space-y-6 max-w-3xl">
          {/* Live System Status Badge */}
          {statusConfig && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono tracking-wider uppercase backdrop-blur-sm ${statusConfig.color}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full animate-ping ${statusConfig.indicator}`}
              />
              <span
                className={`h-1.5 w-1.5 rounded-full absolute ${statusConfig.indicator}`}
              />
              {statusConfig.label}
            </motion.div>
          )}

          {/* Glowing Titles */}
          <div className="space-y-4">
            <motion.h1
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-400 to-purple-400 drop-shadow-[0_0_20px_rgba(129,140,248,0.2)]"
            >
              SPACE SCAVENGER HUNT
            </motion.h1>

            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-xl md:text-3xl font-semibold tracking-widest text-cyan-300/90 uppercase flex items-center justify-center gap-3"
            >
              <Sparkles
                className="size-5 text-cyan-400 animate-spin"
                style={{ animationDuration: "6s" }}
              />
              Save the Astronauts
              <Sparkles
                className="size-5 text-cyan-400 animate-spin"
                style={{ animationDuration: "6s" }}
              />
            </motion.h2>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm md:text-base text-slate-400 max-w-xl mx-auto leading-relaxed"
          >
            The Starfarer-9 has suffered a critical hull failure. Its crew is
            stranded across orbital coordinates. Enlist with your team, decrypt
            sector logs, and rescue them before life support systems fail.
          </motion.p>
        </div>

        {/* Dashboard / Control Center Panel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md shadow-[0_0_40px_rgba(6,182,212,0.08)] rounded-none relative overflow-hidden group">
            {/* Top accent line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-indigo-500 via-cyan-500 to-purple-500" />

            <CardHeader className="text-center pb-2">
              <CardTitle className="font-mono text-cyan-400 tracking-wider text-sm flex items-center justify-center gap-2">
                <Terminal className="size-4" />
                COMMAND TELEMETRY
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                {session
                  ? "AUTHENTICATED PLAYER PORTAL"
                  : "UNENLISTED PILOT LINK"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-2">
              {session ? (
                <div className="space-y-4">
                  <div className="bg-slate-950/50 p-4 border border-slate-800 rounded-none space-y-3 font-mono text-xs text-left">
                    <div className="flex justify-between border-b border-slate-900 pb-1.5">
                      <span className="text-slate-500">OPERATOR:</span>
                      <span className="text-slate-200 font-bold">
                        {me.data?.user.name || session.user.name}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 pb-1.5">
                      <span className="text-slate-500">SECTOR ASSIGNMENT:</span>
                      <span className="text-slate-200">
                        {me.data?.user.role === "ADMIN" ? (
                          <span className="text-purple-400 font-bold">
                            MISSION CONTROL ADMIN
                          </span>
                        ) : me.data?.player?.team ? (
                          <span
                            className="font-bold"
                            style={{
                              color: me.data.player.team.color || "#38bdf8",
                            }}
                          >
                            {me.data.player.team.name.toUpperCase()}
                          </span>
                        ) : (
                          "UNASSIGNED"
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">MISSION CONFIG:</span>
                      <span className="text-slate-200 uppercase">
                        {activityStatus}
                      </span>
                    </div>
                  </div>

                  <motion.div {...buttonInteraction}>
                    <Button
                      onClick={handleEnterMission}
                      className="w-full h-10 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-mono tracking-widest uppercase rounded-none border border-cyan-400/30 hover:border-cyan-400/60 shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all duration-300"
                    >
                      Enter Mission Control
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-center text-xs text-slate-400 leading-relaxed font-mono">
                    Awaiting authorization key. Enlist as a rescue pilot to
                    access sector coordinates and telemetry log files.
                  </p>

                  <motion.div {...buttonInteraction}>
                    <Button
                      onClick={handleEnterMission}
                      className="w-full h-10 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-mono tracking-widest uppercase rounded-none border border-cyan-400/30 hover:border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all duration-300"
                    >
                      INITIALIZE LAUNCH SEQUENCE
                    </Button>
                  </motion.div>

                  <p className="text-[10px] text-center text-slate-500 font-mono">
                    Request an authorization pass from your Mission Commander.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Mission Briefing Guidelines */}
        <div className="w-full space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <Orbit
              className="size-5 text-indigo-400 animate-spin"
              style={{ animationDuration: "10s" }}
            />
            <h3 className="font-mono text-sm tracking-widest text-indigo-300 uppercase">
              RESCUE PROTOCOL BRIEFING
            </h3>
          </div>

          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {/* Step 1 */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -4, borderColor: "rgba(99, 102, 241, 0.4)" }}
              className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-none space-y-3 transition-colors duration-300"
            >
              <div className="h-8 w-8 rounded-none bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Users className="size-4" />
              </div>
              <h4 className="font-mono text-xs tracking-wider text-slate-200 uppercase font-bold">
                1. Deploy Squads
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Form search parties under authorized flight names. Work together
                in close radio telemetry to share coordinate intelligence.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -4, borderColor: "rgba(6, 182, 212, 0.4)" }}
              className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-none space-y-3 transition-colors duration-300"
            >
              <div className="h-8 w-8 rounded-none bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Terminal className="size-4" />
              </div>
              <h4 className="font-mono text-xs tracking-wider text-slate-200 uppercase font-bold">
                2. Decrypt Coordinates
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Decrypt distress beacons scattered across the sector. Bypass
                local mainframes by resolving mathematical & logical sector
                questions.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -4, borderColor: "rgba(168, 85, 247, 0.4)" }}
              className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-none space-y-3 transition-colors duration-300"
            >
              <div className="h-8 w-8 rounded-none bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Rocket className="size-4" />
              </div>
              <h4 className="font-mono text-xs tracking-wider text-slate-200 uppercase font-bold">
                3. Secure Extrication
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Log the found crew members with correct authorization codes to
                dispatch secure escape pods. Save the astronauts in time!
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Live Leaderboard / Telemetry Feed */}
        <div className="w-full space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <Trophy className="size-5 text-amber-400" />
              <h3 className="font-mono text-sm tracking-widest text-amber-300 uppercase">
                SECTOR RANKINGS (LIVE FEED)
              </h3>
            </div>
            <Link
              href="/leaderboard"
              className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline font-mono"
            >
              FULL FEED &rarr;
            </Link>
          </div>

          <div className="bg-slate-900/30 border border-slate-800/60 rounded-none overflow-hidden p-4">
            {board.data && board.data.length > 0 ? (
              <motion.div
                className="space-y-3 font-mono text-xs"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {board.data.slice(0, 4).map((team, idx) => (
                  <motion.div
                    key={team.teamId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-950/40 border border-slate-900 px-4 py-2.5 rounded-none hover:bg-slate-900/20 transition-colors gap-1 sm:gap-0"
                    variants={fadeInUp}
                    whileHover={{ x: 4, borderColor: "rgba(6, 182, 212, 0.3)" }}
                    transition={springTransition}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-500">
                        0{idx + 1}.
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: team.color || "#3b82f6" }}
                        />
                        <span className="text-slate-200 font-medium truncate">
                          {team.teamName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pl-8 sm:pl-0">
                      <span className="text-slate-500">RESCUED:</span>
                      <span className="text-cyan-400 font-bold">
                        {team.claimedCount} / {team.assignedCount}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-2">
                <AlertCircle className="size-4 text-slate-600" />
                AWAITING TEAMS REGISTRATION... NO LIVE DISTRESS DATA
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900/80 py-6 px-6 bg-slate-950/80 backdrop-blur-sm relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-mono text-slate-500">
          <div>SYSTEM: ALPHA-OMEGA SECTOR SCAVENGER HUNT </div>
          <div>&copy; {new Date().getFullYear()} LEETO</div>
        </div>
      </footer>
    </div>
  );
}
