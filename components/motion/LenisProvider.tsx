"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { useMotionAllowed } from "@/lib/motion/useMotionAllowed";

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const motionAllowed = useMotionAllowed();

  useEffect(() => {
    if (!motionAllowed) return;

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
    });

    let frameId: number;
    function raf(time: number) {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    }
    frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, [motionAllowed]);

  return <>{children}</>;
}
