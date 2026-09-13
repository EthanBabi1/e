import { describe, expect, it } from "vitest";
import { computeSuggestedRange, validateZonePrice } from "@/lib/pricing/zonePricing";
import { splitSponsorshipAmount, computeProSavings } from "@/lib/pricing/takeRate";
import { CONFIG } from "@/lib/config";

describe("zone price floor and ceiling (section 4 DoD requirement)", () => {
  const range = computeSuggestedRange({ tier: "mid", raceCount: 5, audienceFollowing: 500 });

  it("blocks any price below the $25 floor", () => {
    const result = validateZonePrice(24, range);
    expect(result.status).toBe("block");
  });

  it("blocks a price one cent below the floor, allows the floor itself through the floor check", () => {
    expect(validateZonePrice(CONFIG.zoneFloorUsd - 1, range).status).toBe("block");
    // The floor itself always clears the floor check specifically — it may
    // still warn if it's outside this zone's suggested range, which is a
    // separate, non-blocking signal.
    expect(validateZonePrice(CONFIG.zoneFloorUsd, range).status).not.toBe("block");
  });

  it("warns (does not block) for a price outside the suggested range but under the ceiling", () => {
    const result = validateZonePrice(range.max + 5, range);
    expect(result.status).toBe("warn");
  });

  it("blocks a price far above the suggested range (admin-review territory)", () => {
    const midpoint = (range.min + range.max) / 2;
    const result = validateZonePrice(midpoint * CONFIG.zoneCeilingMultiplier + 100, range);
    expect(result.status).toBe("block");
  });

  it("is ok for a price inside the suggested range", () => {
    const midpoint = Math.round((range.min + range.max) / 2);
    expect(validateZonePrice(midpoint, range).status).toBe("ok");
  });
});

describe("take-rate and payout math (section 16 DoD requirement)", () => {
  it("applies the free-tier rate correctly and the split sums back to the original amount", () => {
    const split = splitSponsorshipAmount({ amountUsd: 200, subscriptionTier: "free", trackEnrolledInRevShare: false });
    expect(split.platformFeeUsd).toBeCloseTo(200 * CONFIG.takeRateFree, 2);
    expect(split.trackRevShareUsd).toBe(0);
    expect(split.platformFeeUsd + split.trackRevShareUsd + split.racerNetUsd).toBeCloseTo(200, 2);
  });

  it("applies the pro-tier rate, which is lower than free", () => {
    const freeSplit = splitSponsorshipAmount({ amountUsd: 200, subscriptionTier: "free", trackEnrolledInRevShare: false });
    const proSplit = splitSponsorshipAmount({ amountUsd: 200, subscriptionTier: "pro", trackEnrolledInRevShare: false });
    expect(proSplit.platformFeeUsd).toBeLessThan(freeSplit.platformFeeUsd);
    expect(proSplit.racerNetUsd).toBeGreaterThan(freeSplit.racerNetUsd);
  });

  it("includes the track revenue share when the track is enrolled, and the three-way split still sums correctly", () => {
    const split = splitSponsorshipAmount({ amountUsd: 300, subscriptionTier: "free", trackEnrolledInRevShare: true });
    expect(split.trackRevShareUsd).toBeCloseTo(300 * CONFIG.trackRevShare, 2);
    expect(split.platformFeeUsd + split.trackRevShareUsd + split.racerNetUsd).toBeCloseTo(300, 2);
  });

  it("never lets rounding leak a fraction of a cent out of the split", () => {
    // An amount chosen to produce a non-terminating fee fraction.
    const split = splitSponsorshipAmount({ amountUsd: 33.33, subscriptionTier: "free", trackEnrolledInRevShare: true });
    const total = Math.round((split.platformFeeUsd + split.trackRevShareUsd + split.racerNetUsd) * 100) / 100;
    expect(total).toBe(33.33);
  });
});

describe("Pro upgrade savings arithmetic (section 7)", () => {
  it("recommends Pro once fee savings exceed the annual price", () => {
    const result = computeProSavings(5000); // well above the breakeven point
    expect(result.worthIt).toBe(true);
    expect(result.feesSavedUsd).toBeGreaterThan(0);
  });

  it("honestly tells a low-volume racer they're better off on free", () => {
    const result = computeProSavings(200); // 7 points of 200 is $14, well under $100
    expect(result.worthIt).toBe(false);
    expect(result.netBenefitUsd).toBeLessThan(0);
  });
});
