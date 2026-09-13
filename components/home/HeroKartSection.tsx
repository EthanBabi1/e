"use client";

import { HeroScrub } from "@/components/ui/hero-scrub";

const KART_FRAME_COUNT = 90;

/**
 * Thin client wrapper: a Server Component (the homepage) can't pass a
 * function prop like `frameUrl` to a Client Component (React can't
 * serialize a closure across that boundary) — this defines it locally
 * instead, so the page itself stays a Server Component.
 */
export function HeroKartSection() {
  return (
    <HeroScrub
      frameCount={KART_FRAME_COUNT}
      frameUrl={(i) => `/hero-kart/frame-${String(i + 1).padStart(4, "0")}.webp`}
      titleTop="Every part"
      titleBottom="Counts"
      accentHex="#0A0A0B"
    />
  );
}
