"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type Player = { id: string; name: string };

export default function NameWheel({
  candidates,
  spinningTarget,
  reveal,
}: {
  candidates: Player[];
  spinningTarget: Player | null;
  reveal: Player | null;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!spinningTarget) return;
    const id = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, [spinningTarget]);

  if (reveal) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={reveal.id}
          initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 1.2, opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="text-6xl md:text-8xl font-black tracking-tight text-center"
        >
          {reveal.name}
        </motion.div>
      </AnimatePresence>
    );
  }

  if (spinningTarget && candidates.length > 0) {
    const displayName = candidates[tick % candidates.length]?.name ?? spinningTarget.name;
    return (
      <motion.div
        animate={{ y: [0, -6, 0, 6, 0] }}
        transition={{ repeat: Infinity, duration: 0.6 }}
        className="text-5xl md:text-7xl font-black tracking-tight text-center text-muted-foreground"
      >
        {displayName}
      </motion.div>
    );
  }

  return (
    <div className="text-3xl md:text-5xl font-bold text-center text-muted-foreground">
      Waiting for Mission Control...
    </div>
  );
}
