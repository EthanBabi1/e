"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMotionAllowed } from "@/lib/motion/useMotionAllowed";

const CAPTURE_RADIUS = 40;

export function MagneticButton({
  children,
  className,
  onClick,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
}) {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const motionAllowed = useMotionAllowed();
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent) {
    if (!motionAllowed || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const distance = Math.hypot(dx, dy);
    if (distance < rect.width / 2 + CAPTURE_RADIUS) {
      setOffset({ x: dx * 0.25, y: dy * 0.25 });
    } else {
      setOffset({ x: 0, y: 0 });
    }
  }

  const resolvedClassName =
    className ??
    "inline-flex items-center justify-center rounded-full bg-ink text-paper px-6 py-3 text-sm font-medium";

  if (href) {
    return (
      <motion.a
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setOffset({ x: 0, y: 0 })}
        animate={{ x: offset.x, y: offset.y }}
        transition={{ type: "spring", stiffness: 150, damping: 12 }}
        className={resolvedClassName}
      >
        {children}
      </motion.a>
    );
  }

  return (
    <motion.button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: "spring", stiffness: 150, damping: 12 }}
      className={resolvedClassName}
    >
      {children}
    </motion.button>
  );
}
