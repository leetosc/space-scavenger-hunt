"use client";

import { Card } from "@space-scavenger-hunt/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import {
  staggerContainer,
  fadeInUp,
  popIn,
  fadeIn,
} from "@/lib/animations";
import { trpc } from "@/utils/trpc";

function Stat({ label, value, idx }: { label: string; value: string | number; idx: number }) {
  return (
    <motion.div
      variants={popIn}
      initial="hidden"
      animate="visible"
      transition={{ delay: idx * 0.08 }}
    >
      <Card className="p-4 gap-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </Card>
    </motion.div>
  );
}

export default function AdminOverviewPage() {
  const validate = useQuery(trpc.activity.validateSetup.queryOptions());

  if (!validate.data) {
    return <p className="text-sm text-muted-foreground">Loading setup status...</p>;
  }

  const { activity, counts, issues, ready } = validate.data;

  return (
    <motion.div
      className="space-y-6 max-w-4xl"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.header
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-2"
        variants={fadeInUp}
      >
        <div>
          <h1 className="text-2xl font-bold">Mission Control</h1>
          <p className="text-sm text-muted-foreground">
            Activity status: <span className="font-mono">{activity.status}</span>
          </p>
        </div>
        <motion.span
          className={`rounded px-2 py-1 text-xs font-medium ${ready ? "bg-green-500/15 text-green-600" : "bg-amber-500/15 text-amber-700"}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {ready ? "Ready" : "Setup incomplete"}
        </motion.span>
      </motion.header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Teams" value={counts.teams} idx={0} />
        <Stat label="Players" value={counts.players} idx={1} />
        <Stat label="Unassigned" value={counts.unassignedPlayers} idx={2} />
        <Stat label="Astronauts" value={counts.astronauts} idx={3} />
        <Stat label="Assignments" value={counts.assignments} idx={4} />
      </div>

      <motion.div variants={fadeIn}>
        {issues.length > 0 ? (
          <Card className="p-4 gap-2">
            <h2 className="font-bold">Setup issues</h2>
            <ul className="list-disc pl-5 text-sm">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card className="p-4">
            <p className="text-sm">Setup looks good. Head to Kickoff when you are ready to launch.</p>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}
