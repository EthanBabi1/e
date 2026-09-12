import { CONFIG } from "@/lib/config";

export interface RatingState {
  mu: number;
  sigma: number;
  rankedResultCount: number;
}

export const DEFAULT_RATING: RatingState = { mu: 1400, sigma: 300, rankedResultCount: 0 };

const BASE_K = 32;
const MIN_SIGMA = 40;
const SIGMA_DECAY = 0.92;

export interface RaceParticipant {
  racerId: string;
  position: number | null;
  status: "finished" | "dnf" | "dns" | "dq";
}

function eloExpected(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

/**
 * Section 8: Elo-style, per race, weighted by field strength (K is divided
 * across pairwise comparisons so a 20-kart field doesn't produce a 20x
 * bigger swing than a 6-kart field), DNF/DNS excluded from movement
 * entirely (they still exist in the results table, they just don't touch
 * the rating). DQ is treated as a real finishing-position outcome — the
 * brief only names mechanical failure (DNF) and no-shows (DNS) as
 * exclusions, not disqualification; see DECISIONS.md.
 */
export function updateRatingsForRace(
  participants: RaceParticipant[],
  currentRatings: Map<string, RatingState>
): Map<string, RatingState> {
  const ranked = participants.filter((p) => p.status !== "dnf" && p.status !== "dns" && p.position != null);

  const next = new Map<string, RatingState>(currentRatings);
  for (const p of participants) {
    if (!next.has(p.racerId)) next.set(p.racerId, { ...DEFAULT_RATING });
  }

  if (ranked.length < 2) {
    // Nothing to compare against — no movement, but a single-entrant
    // "race" still shouldn't count toward the ranked threshold.
    return next;
  }

  const fieldSize = ranked.length;
  const perPairK = BASE_K / (fieldSize - 1);
  const deltas = new Map<string, number>(ranked.map((p) => [p.racerId, 0]));

  for (let i = 0; i < ranked.length; i++) {
    for (let j = 0; j < ranked.length; j++) {
      if (i === j) continue;
      const a = ranked[i];
      const b = ranked[j];
      const ratingA = next.get(a.racerId)!.mu;
      const ratingB = next.get(b.racerId)!.mu;
      const actual = a.position! < b.position! ? 1 : 0; // lower position number = finished ahead
      const expected = eloExpected(ratingA, ratingB);
      deltas.set(a.racerId, deltas.get(a.racerId)! + perPairK * (actual - expected));
    }
  }

  for (const p of ranked) {
    const state = next.get(p.racerId)!;
    const delta = deltas.get(p.racerId)! / (fieldSize - 1);
    const newMu = state.mu + delta;
    const newSigma = Math.max(MIN_SIGMA, state.sigma * SIGMA_DECAY);
    const newCount = state.rankedResultCount + 1;
    next.set(p.racerId, {
      mu: newMu,
      sigma: newSigma,
      rankedResultCount: newCount,
    });
  }

  return next;
}

export function isProvisional(state: RatingState): boolean {
  return state.rankedResultCount < CONFIG.ratingProvisionalThreshold;
}

/** "1420 ± 85" — never a bare number (section 8). */
export function confidenceBandLabel(state: RatingState): string {
  return `${Math.round(state.mu)} ± ${Math.round(state.sigma)}`;
}
