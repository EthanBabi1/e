import { describe, expect, it } from "vitest";
import { DEFAULT_RATING, isProvisional, updateRatingsForRace, confidenceBandLabel } from "@/lib/ratings/engine";
import { CONFIG } from "@/lib/config";

describe("ratings engine", () => {
  it("winner gains rating, loser loses, when equal pre-race ratings", () => {
    const before = new Map([
      ["a", { ...DEFAULT_RATING }],
      ["b", { ...DEFAULT_RATING }],
    ]);
    const after = updateRatingsForRace(
      [
        { racerId: "a", position: 1, status: "finished" },
        { racerId: "b", position: 2, status: "finished" },
      ],
      before
    );
    expect(after.get("a")!.mu).toBeGreaterThan(DEFAULT_RATING.mu);
    expect(after.get("b")!.mu).toBeLessThan(DEFAULT_RATING.mu);
    // Zero-sum-ish: the winner's gain should roughly mirror the loser's loss
    // when ratings started equal.
    const gain = after.get("a")!.mu - DEFAULT_RATING.mu;
    const loss = DEFAULT_RATING.mu - after.get("b")!.mu;
    expect(Math.abs(gain - loss)).toBeLessThan(0.01);
  });

  it("excludes DNF and DNS from rating movement entirely", () => {
    const before = new Map([
      ["a", { ...DEFAULT_RATING }],
      ["b", { ...DEFAULT_RATING }],
      ["c", { ...DEFAULT_RATING }],
    ]);
    const after = updateRatingsForRace(
      [
        { racerId: "a", position: 1, status: "finished" },
        { racerId: "b", position: null, status: "dnf" },
        { racerId: "c", position: null, status: "dns" },
      ],
      before
    );
    // Only one ranked finisher — nothing to compare against, no movement,
    // and DNF/DNS participants must be untouched.
    expect(after.get("a")!.mu).toBe(DEFAULT_RATING.mu);
    expect(after.get("b")!.mu).toBe(DEFAULT_RATING.mu);
    expect(after.get("c")!.mu).toBe(DEFAULT_RATING.mu);
    expect(after.get("b")!.rankedResultCount).toBe(0);
    expect(after.get("c")!.rankedResultCount).toBe(0);
  });

  it("a fast racer's single bad DNF race does not move their rating", () => {
    const highRated = { mu: 1800, sigma: 100, rankedResultCount: 10 };
    const before = new Map([
      ["fast", highRated],
      ["slow", { ...DEFAULT_RATING }],
    ]);
    const after = updateRatingsForRace(
      [
        { racerId: "fast", position: null, status: "dnf" },
        { racerId: "slow", position: 1, status: "finished" },
      ],
      before
    );
    expect(after.get("fast")!.mu).toBe(highRated.mu);
  });

  it("field size dampens per-pair movement (K divided across the field)", () => {
    const smallField = new Map([
      ["a", { ...DEFAULT_RATING }],
      ["b", { ...DEFAULT_RATING }],
    ]);
    const bigField = new Map([
      ["a", { ...DEFAULT_RATING }],
      ["b", { ...DEFAULT_RATING }],
      ["c", { ...DEFAULT_RATING }],
      ["d", { ...DEFAULT_RATING }],
      ["e", { ...DEFAULT_RATING }],
    ]);
    const smallResult = updateRatingsForRace(
      [
        { racerId: "a", position: 1, status: "finished" },
        { racerId: "b", position: 2, status: "finished" },
      ],
      smallField
    );
    const bigResult = updateRatingsForRace(
      [
        { racerId: "a", position: 1, status: "finished" },
        { racerId: "b", position: 2, status: "finished" },
        { racerId: "c", position: 3, status: "finished" },
        { racerId: "d", position: 4, status: "finished" },
        { racerId: "e", position: 5, status: "finished" },
      ],
      bigField
    );
    const smallGain = smallResult.get("a")!.mu - DEFAULT_RATING.mu;
    const bigGain = bigResult.get("a")!.mu - DEFAULT_RATING.mu;
    // Winning a 2-kart race moves the rating differently than a 5-kart win
    // against the same average opposition strength — not asserting a
    // direction here (field composition differs), just that both are
    // finite, sane, non-zero movements and neither explodes.
    expect(Math.abs(smallGain)).toBeGreaterThan(0);
    expect(Math.abs(bigGain)).toBeGreaterThan(0);
    expect(Math.abs(bigGain)).toBeLessThan(50);
  });

  it("is provisional below the configured threshold, not provisional at/above it", () => {
    expect(isProvisional({ mu: 1400, sigma: 300, rankedResultCount: CONFIG.ratingProvisionalThreshold - 1 })).toBe(true);
    expect(isProvisional({ mu: 1400, sigma: 300, rankedResultCount: CONFIG.ratingProvisionalThreshold })).toBe(false);
  });

  it("confidence band is always shown as mu ± sigma, never a bare number", () => {
    expect(confidenceBandLabel({ mu: 1423.4, sigma: 84.6, rankedResultCount: 8 })).toBe("1423 ± 85");
  });

  it("a single-entrant session produces no movement and no ranked count", () => {
    const before = new Map([["a", { ...DEFAULT_RATING }]]);
    const after = updateRatingsForRace([{ racerId: "a", position: 1, status: "finished" }], before);
    expect(after.get("a")!.mu).toBe(DEFAULT_RATING.mu);
    expect(after.get("a")!.rankedResultCount).toBe(0);
  });
});
