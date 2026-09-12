"use client";

import { useReducedMotion } from "framer-motion";

/**
 * Single choke point for the "is motion allowed" question. Every motion
 * primitive in components/motion imports this instead of checking
 * matchMedia itself, so prefers-reduced-motion is enforced in one place
 * (DESIGN.md) rather than hoped-for in every component.
 */
export function useMotionAllowed(): boolean {
  const prefersReduced = useReducedMotion();
  return !prefersReduced;
}
