import { CONFIG } from "@/lib/config";

export interface SuggestedRange {
  min: number;
  max: number;
}

const TIER_BASE: Record<"premium" | "mid" | "entry", SuggestedRange> = {
  premium: { min: 150, max: 300 },
  mid: { min: 80, max: 150 },
  entry: { min: 40, max: 80 },
};

/**
 * Section 4: "Racer sets prices, with a suggested range from the platform
 * based on race count, consistency, audience and comparables. A range,
 * never a mandate." With no historical comparables data yet, this scales
 * a tier baseline modestly by activity/audience signals — a defensible
 * starting point, not a precision model. Revisit once there's enough real
 * sponsorship transaction data to calibrate against actual comparables.
 */
export function computeSuggestedRange(params: {
  tier: "premium" | "mid" | "entry";
  raceCount: number;
  audienceFollowing: number | null;
}): SuggestedRange {
  const base = TIER_BASE[params.tier];
  const activityMultiplier = 1 + Math.min(0.5, params.raceCount * 0.02);
  const audienceMultiplier = 1 + Math.min(0.3, (params.audienceFollowing ?? 0) / 10000);
  const multiplier = activityMultiplier * audienceMultiplier;

  return {
    min: Math.round(base.min * multiplier),
    max: Math.round(base.max * multiplier),
  };
}

export type PriceValidation =
  | { status: "ok" }
  | { status: "warn"; message: string }
  | { status: "block"; message: string };

/**
 * Section 4's price bounds — both configurable, both enforced here as the
 * single source of truth: "Nothing below $25... Nothing above 4x the
 * suggested range without an admin review flag... Warn inside the range,
 * block outside it, and explain why in plain language."
 *
 * Reading "the suggested range" for the ceiling as the range's midpoint
 * (not its max) is a judgment call — using the max would let a listing
 * already at the top of a generous range multiply from there, which
 * defeats the point of a ceiling. Documented in DECISIONS.md.
 */
export function validateZonePrice(priceUsd: number, suggestedRange: SuggestedRange): PriceValidation {
  if (priceUsd < CONFIG.zoneFloorUsd) {
    return {
      status: "block",
      message: `$${priceUsd} is below the $${CONFIG.zoneFloorUsd} floor — below that, fees make the sale not worth doing for you.`,
    };
  }

  const midpoint = (suggestedRange.min + suggestedRange.max) / 2;
  const ceiling = midpoint * CONFIG.zoneCeilingMultiplier;
  if (priceUsd > ceiling) {
    return {
      status: "block",
      message: `$${priceUsd} is far above the typical range for this zone ($${suggestedRange.min}–$${suggestedRange.max}) — listings this high need a quick admin review first.`,
    };
  }

  if (priceUsd < suggestedRange.min || priceUsd > suggestedRange.max) {
    return {
      status: "warn",
      message: `This is outside the typical $${suggestedRange.min}–$${suggestedRange.max} range for this zone — you can still list at this price.`,
    };
  }

  return { status: "ok" };
}
