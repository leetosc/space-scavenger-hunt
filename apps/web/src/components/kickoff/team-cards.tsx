"use client";

import { AnimatePresence, motion } from "framer-motion";

import { ICON_MAP } from "@/lib/icons";

type TeamWithPlayers = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  players: { id: string; name: string }[];
};

interface TeamCardsProps {
  teams: TeamWithPlayers[];
  registerRef?: (teamId: string, el: HTMLDivElement | null) => void;
  highlightTeamId?: string | null;
}

export default function TeamCards({
  teams,
  registerRef,
  highlightTeamId,
}: TeamCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {teams.map((team) => (
        <motion.div
          key={team.id}
          ref={registerRef ? (el) => registerRef(team.id, el) : undefined}
          className="rounded-xl border bg-card p-4 flex flex-col gap-2 min-h-[180px] relative overflow-hidden"
          style={team.color ? { borderColor: team.color } : undefined}
          animate={
            highlightTeamId === team.id
              ? {
                  scale: [1, 1.08, 1],
                  borderColor: [
                    team.color ?? "#888",
                    "#facc15",
                    team.color ?? "#888",
                  ],
                }
              : {}
          }
          transition={{ duration: 0.6 }}
        >
          {/* Impact flash */}
          <AnimatePresence>
            {highlightTeamId === team.id && (
              <motion.div
                className="absolute inset-0 pointer-events-none z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7 }}
                style={{
                  background: `radial-gradient(circle at center, ${team.color ?? "#facc15"}50 0%, transparent 70%)`,
                }}
              />
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2 relative z-20">
            {(() => {
              const Icon = team.icon ? ICON_MAP[team.icon] : null;
              return (
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded text-white"
                  style={{ backgroundColor: team.color ?? "#888" }}
                >
                  {Icon ? (
                    <Icon className="size-4" />
                  ) : (
                    <span className="text-sm font-bold">
                      {team.name.slice(0, 1)}
                    </span>
                  )}
                </span>
              );
            })()}
            <h3 className="text-lg font-bold">{team.name}</h3>
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              {team.players.length}
            </span>
          </div>

          <ul className="text-sm space-y-1 relative z-20">
            <AnimatePresence initial={false}>
              {team.players.map((p) => (
                <motion.li
                  key={p.id}
                  initial={{ x: -20, opacity: 0, scale: 0.8 }}
                  animate={{ x: 0, opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {p.name}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </motion.div>
      ))}
    </div>
  );
}
