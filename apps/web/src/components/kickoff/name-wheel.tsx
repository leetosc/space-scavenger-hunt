"use client";

import { animate, motion, useMotionValue } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";

type Player = { id: string; name: string };

export type WheelPhase = "idle" | "spinning" | "selected" | "flying";

interface NameWheelProps {
  candidates: Player[];
  phase: WheelPhase;
  target: Player | null;
  onSpinComplete?: () => void;
}

/* ------------------------------------------------------------------ */
/*  SVG geometry                                                       */
/* ------------------------------------------------------------------ */

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function piSlice(cx: number, cy: number, r: number, a1: number, a2: number) {
  if (a2 - a1 >= 359.99) {
    // Full circle – two arcs to avoid SVG zero-length-arc bug
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  }
  const s = polar(cx, cy, r, a1);
  const e = polar(cx, cy, r, a2);
  const big = a2 - a1 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${big} 1 ${e.x} ${e.y} Z`;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const W = 400;
const CX = W / 2;
const CY = W / 2;
const R = W / 2 - 10;

const FILLS = [
  "#1e3a6e", "#581c87", "#164e63", "#9f1239",
  "#1e3050", "#4c1d95", "#155e75", "#7f1d1d",
  "#0f2042", "#6b21a8", "#134e4a", "#92400e",
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function NameWheel({
  candidates,
  phase,
  target,
  onSpinComplete,
}: NameWheelProps) {
  const rot = useMotionValue(0);
  const cumRef = useRef(0);
  const ctrlRef = useRef<ReturnType<typeof animate> | null>(null);

  /* Names displayed on the wheel (keep target visible during anim) */
  const names = useMemo(() => {
    if (!target) return candidates;
    return candidates.some((c) => c.id === target.id)
      ? candidates
      : [...candidates, target];
  }, [candidates, target]);

  const N = names.length;
  const seg = N > 0 ? 360 / N : 360;

  const tgtIdx = useMemo(() => {
    if (!target || N === 0) return 0;
    const i = names.findIndex((c) => c.id === target.id);
    return i >= 0 ? i : 0;
  }, [target, names, N]);

  /* ── Idle: slow continuous rotation ── */
  useEffect(() => {
    if (phase !== "idle" || N === 0) return;
    let alive = true;
    const loop = () => {
      if (!alive) return;
      const from = cumRef.current;
      ctrlRef.current = animate(rot, from + 360, {
        duration: 80,
        ease: "linear",
        onComplete: () => {
          cumRef.current = from + 360;
          loop();
        },
      });
    };
    loop();
    return () => {
      alive = false;
      ctrlRef.current?.stop();
      cumRef.current = rot.get();
    };
  }, [phase, N, rot]);

  /* ── Spin to target ── */
  useEffect(() => {
    if (phase !== "spinning" || N === 0) return;
    ctrlRef.current?.stop();

    const center = tgtIdx * seg + seg / 2;
    const need = (((360 - center) % 360) + 360) % 360;
    const cur = ((cumRef.current % 360) + 360) % 360;
    const extra = (((need - cur) % 360) + 360) % 360;
    const spins = 5 + Math.floor(Math.random() * 3);
    const dest = cumRef.current + spins * 360 + extra;

    ctrlRef.current = animate(rot, dest, {
      duration: 3.2,
      ease: [0.12, 0.75, 0.22, 1],
      onComplete: () => {
        cumRef.current = dest;
        onSpinComplete?.();
      },
    });
    return () => {
      ctrlRef.current?.stop();
      cumRef.current = rot.get();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ── Derived sizing ── */
  const fs = N <= 6 ? 15 : N <= 10 ? 13 : N <= 16 ? 11 : N <= 24 ? 9 : 7;
  const maxC = N <= 6 ? 14 : N <= 10 ? 12 : N <= 16 ? 10 : 7;
  const nameR = R * 0.62;
  const clip = (s: string) =>
    s.length > maxC ? s.slice(0, maxC - 1) + "\u2026" : s;

  /* ── Empty state ── */
  if (N === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-3xl md:text-5xl font-bold text-center text-muted-foreground"
      >
        All astronauts deployed!
      </motion.div>
    );
  }

  return (
    <div
      className="relative"
      style={{ width: W, height: W }}
    >
      {/* ── Glow ring ── */}
      <motion.div
        className="absolute inset-[-12px] rounded-full pointer-events-none"
        animate={{
          boxShadow:
            phase === "spinning"
              ? [
                  "0 0 40px 10px rgba(139,92,246,.5), 0 0 100px 20px rgba(59,130,246,.3)",
                  "0 0 70px 20px rgba(236,72,153,.5), 0 0 140px 40px rgba(139,92,246,.3)",
                  "0 0 40px 10px rgba(139,92,246,.5), 0 0 100px 20px rgba(59,130,246,.3)",
                ]
              : phase === "selected"
                ? "0 0 60px 20px rgba(250,204,21,.5), 0 0 120px 40px rgba(250,204,21,.15)"
                : "0 0 20px 6px rgba(139,92,246,.2)",
        }}
        transition={
          phase === "spinning"
            ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.4 }
        }
      />

      {/* ── Pointer ── */}
      <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-20">
        <motion.div
          animate={
            phase === "spinning"
              ? { scale: [1, 1.4, 1], y: [0, 5, 0] }
              : phase === "selected"
                ? { scale: [1.2, 1.5, 1.2] }
                : {}
          }
          transition={
            phase === "spinning"
              ? { duration: 0.25, repeat: Infinity }
              : phase === "selected"
                ? { duration: 0.4, repeat: Infinity }
                : {}
          }
        >
          <svg width="32" height="36" viewBox="0 0 32 36">
            <polygon
              points="16,36 2,0 30,0"
              fill="#facc15"
              filter="drop-shadow(0 0 6px rgba(250,204,21,.8))"
            />
          </svg>
        </motion.div>
      </div>

      {/* ── Spinning wheel ── */}
      <motion.div className="absolute inset-0 z-10" style={{ rotate: rot }}>
        <svg width={W} height={W} viewBox={`0 0 ${W} ${W}`}>
          {/* Outer ring */}
          <circle
            cx={CX}
            cy={CY}
            r={R + 2}
            fill="none"
            stroke="rgba(139,92,246,.35)"
            strokeWidth={3}
          />

          {/* Segments + names */}
          {names.map((p, i) => {
            const a1 = i * seg;
            const a2 = a1 + seg;
            const col = FILLS[i % FILLS.length]!;
            const sel =
              (phase === "selected" || phase === "flying") &&
              target?.id === p.id;
            const hide = phase === "flying" && target?.id === p.id;

            const mid = a1 + seg / 2;
            const pt = polar(CX, CY, nameR, mid);
            const tr = mid - 90 + (mid > 90 && mid < 270 ? 180 : 0);

            return (
              <g key={p.id}>
                <path
                  d={piSlice(CX, CY, R, a1, a2)}
                  fill={sel ? "#fbbf24" : col}
                  stroke="rgba(255,255,255,.12)"
                  strokeWidth={1.5}
                />
                {sel && (
                  <path
                    d={piSlice(CX, CY, R, a1, a2)}
                    fill="rgba(250,204,21,.3)"
                  >
                    <animate
                      attributeName="opacity"
                      values=".2;.6;.2"
                      dur="0.4s"
                      repeatCount="indefinite"
                    />
                  </path>
                )}
                <text
                  x={pt.x}
                  y={pt.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={sel ? "#000" : "#e2e8f0"}
                  fontSize={fs}
                  fontWeight="bold"
                  opacity={hide ? 0 : 1}
                  transform={`rotate(${tr},${pt.x},${pt.y})`}
                >
                  {clip(p.name)}
                </text>
              </g>
            );
          })}

          {/* Segment dividers */}
          {N > 1 &&
            names.map((_, i) => {
              const p = polar(CX, CY, R, i * seg);
              return (
                <line
                  key={`d${i}`}
                  x1={CX}
                  y1={CY}
                  x2={p.x}
                  y2={p.y}
                  stroke="rgba(255,255,255,.15)"
                  strokeWidth={1}
                />
              );
            })}

          {/* Center hub */}
          <circle
            cx={CX}
            cy={CY}
            r={28}
            fill="#0f172a"
            stroke="rgba(139,92,246,.5)"
            strokeWidth={2.5}
          />
          <circle cx={CX} cy={CY} r={8} fill="rgba(139,92,246,.5)" />
          <circle cx={CX} cy={CY} r={3} fill="#a78bfa" />
        </svg>
      </motion.div>

      {/* ── Spark particles during spin ── */}
      {phase === "spinning" && (
        <div className="absolute inset-0 pointer-events-none z-30">
          {Array.from({ length: 16 }, (_, i) => {
            const a = ((360 / 16) * i * Math.PI) / 180;
            return (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  left: CX,
                  top: CY,
                  background:
                    i % 3 === 0
                      ? "#a78bfa"
                      : i % 3 === 1
                        ? "#60a5fa"
                        : "#f472b6",
                }}
                animate={{
                  x: [0, Math.cos(a) * (R + 50)],
                  y: [0, Math.sin(a) * (R + 50)],
                  opacity: [1, 0],
                  scale: [1.5, 0],
                }}
                transition={{
                  duration: 0.7 + (i % 5) * 0.06,
                  repeat: Infinity,
                  delay: i * 0.12,
                  ease: "easeOut",
                }}
              />
            );
          })}
        </div>
      )}

      {/* ── Flashing lights on selection ── */}
      {phase === "selected" && (
        <div className="absolute inset-0 pointer-events-none z-30">
          {Array.from({ length: 12 }, (_, i) => {
            const a = ((360 / 12) * i * Math.PI) / 180;
            const lx = CX + Math.cos(a) * (R + 18);
            const ly = CY + Math.sin(a) * (R + 18);
            return (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  left: lx,
                  top: ly,
                  transform: "translate(-50%,-50%)",
                }}
                animate={{
                  background:
                    i % 2 === 0
                      ? ["#facc15", "#ef4444", "#facc15"]
                      : ["#ef4444", "#facc15", "#ef4444"],
                  scale: [1, 1.4, 1],
                }}
                transition={{ duration: 0.3, repeat: Infinity }}
              />
            );
          })}
        </div>
      )}

      {/* ── Ring burst on selection ── */}
      {phase === "selected" && (
        <>
          {[0, 1, 2].map((ring) => (
            <motion.div
              key={ring}
              className="absolute left-1/2 top-1/2 rounded-full border-2 border-yellow-400/60 pointer-events-none z-30"
              initial={{
                width: 0,
                height: 0,
                x: "-50%",
                y: "-50%",
                opacity: 1,
              }}
              animate={{
                width: W + 80,
                height: W + 80,
                x: "-50%",
                y: "-50%",
                opacity: 0,
              }}
              transition={{
                duration: 0.8,
                delay: ring * 0.15,
                ease: "easeOut",
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
