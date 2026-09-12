"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { useMotionAllowed } from "@/lib/motion/useMotionAllowed";

/**
 * Animates a number from 0 to `value` once, on first view. Never re-triggers
 * on subsequent scroll re-entry (tracked via hasAnimated ref), and never
 * shifts layout because the rendered text is always tabular-numeral width.
 */
export function CountUp({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const motionAllowed = useMotionAllowed();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: 1200, bounce: 0 });
  const [display, setDisplay] = useState("0");
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!inView || hasAnimated.current) return;
    hasAnimated.current = true;

    if (!motionAllowed) {
      setDisplay(value.toFixed(decimals));
      return;
    }
    motionValue.set(value);
  }, [inView, motionAllowed, value, decimals, motionValue]);

  useEffect(() => {
    if (!motionAllowed) return;
    return spring.on("change", (latest) => {
      setDisplay(latest.toFixed(decimals));
    });
  }, [spring, decimals, motionAllowed]);

  return (
    <motion.span ref={ref} className={`tabular ${className ?? ""}`}>
      {prefix}
      {display}
      {suffix}
    </motion.span>
  );
}
