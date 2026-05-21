"use client";

import { Card } from "@space-scavenger-hunt/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import { ICON_MAP } from "@/lib/icons";
import {
  staggerContainer,
  fadeInUp,
  fadeIn,
  scaleIn,
  popIn,
  springTransition,
} from "@/lib/animations";
import { trpc } from "@/utils/trpc";

export default function LeaderboardPage() {
  const board = useQuery({
    ...trpc.leaderboard.getCurrent.queryOptions(),
    refetchInterval: 5000,
  });

  if (!board.data) {
    return (
      <motion.div
        className="p-10 text-center text-sm text-muted-foreground"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Loading leaderboard...
      </motion.div>
    );
  }

  return (
    <motion.div
      className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.header variants={fadeInUp}>
        <h1 className="text-2xl sm:text-3xl font-bold">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">Updated every few seconds.</p>
      </motion.header>

      <motion.div variants={scaleIn}>
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left w-12">#</th>
                  <th className="p-3 text-left">Team</th>
                  <th className="p-3 text-right">Claimed</th>
                  <th className="p-3 text-right hidden sm:table-cell">Rejected</th>
                  <th className="p-3 text-right hidden sm:table-cell">Latest claim</th>
                </tr>
              </thead>
              <motion.tbody
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {board.data.map((row, idx) => (
                  <motion.tr
                    key={row.teamId}
                    className="border-t"
                    variants={fadeInUp}
                    whileHover={{ backgroundColor: "rgba(6, 182, 212, 0.03)" }}
                  >
                    <td className="p-3">
                      <motion.span
                        className="font-bold inline-block"
                        variants={popIn}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: idx * 0.1 }}
                      >
                        {idx + 1}
                      </motion.span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const Icon = row.icon ? ICON_MAP[row.icon] : null;
                          return (
                            <motion.span
                              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-white"
                              style={{ backgroundColor: row.color ?? "#888" }}
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ ...springTransition, delay: 0.1 + idx * 0.08 }}
                            >
                              {Icon ? <Icon className="size-3.5" /> : <span className="text-[10px] font-bold">{row.teamName.slice(0, 1)}</span>}
                            </motion.span>
                          );
                        })()}
                        <span className="font-medium truncate">{row.teamName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right tabular-nums whitespace-nowrap">
                      {row.claimedCount} / {row.assignedCount}
                    </td>
                    <td className="p-3 text-right tabular-nums hidden sm:table-cell">{row.rejectedCount}</td>
                    <td className="p-3 text-right text-xs text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {row.latestClaimAt ? new Date(row.latestClaimAt).toLocaleTimeString() : "\u2014"}
                    </td>
                  </motion.tr>
                ))}
                {board.data.length === 0 && (
                  <motion.tr variants={fadeIn}>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      No teams yet.
                    </td>
                  </motion.tr>
                )}
              </motion.tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
