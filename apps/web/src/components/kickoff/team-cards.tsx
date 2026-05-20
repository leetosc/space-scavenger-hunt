"use client";

import { AnimatePresence, motion } from "framer-motion";

type TeamWithPlayers = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  players: { id: string; name: string }[];
};

export default function TeamCards({ teams }: { teams: TeamWithPlayers[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {teams.map((team) => (
        <div
          key={team.id}
          className="rounded-xl border bg-card p-4 flex flex-col gap-2 min-h-[180px]"
          style={team.color ? { borderColor: team.color } : undefined}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded text-sm font-bold text-white"
              style={{ backgroundColor: team.color ?? "#888" }}
            >
              {team.icon ?? team.name.slice(0, 1)}
            </span>
            <h3 className="text-lg font-bold">{team.name}</h3>
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              {team.players.length}
            </span>
          </div>
          <ul className="text-sm space-y-1">
            <AnimatePresence initial={false}>
              {team.players.map((p) => (
                <motion.li
                  key={p.id}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {p.name}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      ))}
    </div>
  );
}
