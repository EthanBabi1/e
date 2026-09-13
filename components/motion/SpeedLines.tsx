"use client";

import { motion } from "framer-motion";
import { useMotionAllowed } from "@/lib/motion/useMotionAllowed";

/**
 * Purely graphic motion motif (no photography exists for this build —
 * see REVIEW.md) standing in for "does this feel like racing." Diagonal
 * streaks racing in from the left on mount, not on scroll, since this
 * sits in the hero above the fold. Kept to a single color (--accent) and
 * a corner of the viewport, in the same spirit as the brief's own
 * restraint rule ("if more than ~2% of a viewport is accent red, it's
 * wrong") — bold, but not paint-rollered across the whole page.
 */
export function SpeedLines({ className }: { className?: string }) {
  const motionAllowed = useMotionAllowed();

  const lines = [
    { y: 40, width: 420, opacity: 0.9, delay: 0 },
    { y: 90, width: 280, opacity: 0.6, delay: 0.08 },
    { y: 130, width: 340, opacity: 0.4, delay: 0.16 },
    { y: 180, width: 180, opacity: 0.25, delay: 0.24 },
  ];

  return (
    <svg
      className={className}
      viewBox="0 0 600 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {lines.map((line, i) => (
        <motion.line
          key={i}
          x1={600}
          y1={line.y}
          x2={600 - line.width}
          y2={line.y}
          stroke="var(--accent)"
          strokeWidth={i === 0 ? 6 : 3}
          strokeLinecap="round"
          opacity={line.opacity}
          initial={motionAllowed ? { pathLength: 0, x: 60 } : undefined}
          animate={motionAllowed ? { pathLength: 1, x: 0 } : undefined}
          transition={{ duration: 0.7, delay: line.delay, ease: "easeOut" }}
        />
      ))}
    </svg>
  );
}
