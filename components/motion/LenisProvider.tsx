"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionAllowed } from "@/lib/motion/useMotionAllowed";

gsap.registerPlugin(ScrollTrigger);

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const motionAllowed = useMotionAllowed();

  useEffect(() => {
    if (!motionAllowed) return;

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
    });

    // components/ui/hero-scrub.tsx drives its choreography off GSAP's
    // ScrollTrigger, which by default reads the native `scroll` event —
    // Lenis fires that on its own smoothed schedule, not on every native
    // scroll tick, so without this pairing ScrollTrigger reads a stale
    // position mid-scrub. This is the pairing both projects' own docs
    // recommend: GSAP's ticker drives Lenis's raf loop (replacing the
    // plain requestAnimationFrame loop this had before), and Lenis
    // tells ScrollTrigger to recompute on every one of its own frames.
    function gsapDrivenRaf(time: number) {
      lenis.raf(time * 1000);
    }
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(gsapDrivenRaf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(gsapDrivenRaf);
      lenis.destroy();
    };
  }, [motionAllowed]);

  return <>{children}</>;
}
