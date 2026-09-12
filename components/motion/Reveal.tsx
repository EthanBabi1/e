"use client";

import { motion } from "framer-motion";
import { useMotionAllowed } from "@/lib/motion/useMotionAllowed";

export function Reveal({
  children,
  className,
  index = 0,
}: {
  children: React.ReactNode;
  className?: string;
  index?: number;
}) {
  const motionAllowed = useMotionAllowed();

  if (!motionAllowed) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, transform: "translateY(12px)" }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.5, delay: (index % 8) * 0.05, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
