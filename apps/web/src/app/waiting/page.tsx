"use client";

import { Card } from "@space-scavenger-hunt/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import {
  staggerContainer,
  fadeInUp,
  scaleIn,
  float,
  pulse,
} from "@/lib/animations";
import { trpc } from "@/utils/trpc";

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  SETUP: {
    title: "Mission has not launched yet",
    body: "Mission control is preparing. Hang tight - this page will update automatically.",
  },
  TEAM_ASSIGNMENT: {
    title: "Crew assignment in progress",
    body: "Teams are being assigned on the big screen. Watch the kickoff display!",
  },
  ACTIVE: {
    title: "Mission underway",
    body: "Redirecting to your team dashboard.",
  },
  FINISHED: {
    title: "Mission complete",
    body: "Head to the leaderboard to see the final standings.",
  },
};

export default function WaitingPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const activity = useQuery({
    ...trpc.activity.getState.queryOptions(),
    refetchInterval: 3000,
  });
  const me = useQuery({
    ...trpc.player.me.queryOptions(),
    enabled: !!session,
  });

  useEffect(() => {
    if (isPending) return;
    if (!session) router.push("/login");
  }, [isPending, session, router]);

  useEffect(() => {
    if (activity.data?.status === "ACTIVE") router.push("/team");
    if (activity.data?.status === "FINISHED") router.push("/leaderboard");
  }, [activity.data?.status, router]);

  if (!activity.data || !me.data) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  const copy = STATUS_COPY[activity.data.status] ?? STATUS_COPY.SETUP!;

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <motion.div
        className="flex justify-center mb-6"
        variants={float}
        animate="animate"
      >
        <div className="relative">
          <motion.div
            className="h-20 w-20 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(6, 182, 212, 0)",
                "0 0 20px 10px rgba(6, 182, 212, 0.15)",
                "0 0 0 0 rgba(6, 182, 212, 0)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Rocket className="size-8 text-cyan-400" />
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        variants={scaleIn}
        initial="hidden"
        animate="visible"
      >
        <Card className="p-8 gap-3 text-center">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.h1
              className="text-3xl font-bold"
              variants={fadeInUp}
            >
              {copy.title}
            </motion.h1>
            <motion.p
              className="text-sm text-muted-foreground mt-3"
              variants={fadeInUp}
            >
              {copy.body}
            </motion.p>

            {activity.data.status === "TEAM_ASSIGNMENT" ? (
              <motion.div
                className="mt-4 rounded-md border border-cyan-500/15 bg-cyan-500/5 px-4 py-3 text-left"
                variants={fadeInUp}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  Rules summary
                </p>
                <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                  <li>- Search for hidden astronauts</li>
                  <li>- Scan an astronaut with your phone</li>
                  <li>- Complete the task to rescue the astronaut</li>
                </ul>
              </motion.div>
            ) : null}

            {me.data.player ? (
              <motion.p
                className="text-xs text-muted-foreground mt-4"
                variants={fadeInUp}
              >
                <motion.span variants={pulse} animate="animate">
                  Signed in as {me.data.player.name}
                  {me.data.player.team ? ` - Team ${me.data.player.team.name}` : " - no team yet"}
                </motion.span>
              </motion.p>
            ) : null}
          </motion.div>

          <motion.div
            className="flex justify-center gap-1.5 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-cyan-400"
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}
