"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

export default function StarfieldBackground() {
  // Memoize random star field coordinates to prevent layout shifts or re-generation on render
  const stars = useMemo(() => {
    return Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      twinkleDuration: Math.random() * 3 + 2,
      twinkleDelay: Math.random() * 5,
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Twinkling Stars */}
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-indigo-900/20 dark:bg-white/85"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          animate={{
            opacity: [0.1, 1, 0.1],
          }}
          transition={{
            duration: star.twinkleDuration,
            repeat: Infinity,
            delay: star.twinkleDelay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Orbit Rings */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] border border-cyan-500/5 rounded-full z-0 pointer-events-none" />
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] border border-indigo-500/5 rounded-full z-0 pointer-events-none" style={{ transform: "translate(-50%, 0) rotate(15deg)" }} />

      {/* Glowing Nebulae */}
      <div className="absolute top-[-10%] left-[-15%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[130px] z-0" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[60%] h-[60%] rounded-full bg-cyan-500/5 dark:bg-cyan-500/10 blur-[150px] z-0" />
      <div className="absolute top-[30%] left-[60%] w-[40%] h-[40%] rounded-full bg-purple-500/3 dark:bg-purple-500/5 blur-[120px] z-0" />
    </div>
  );
}
