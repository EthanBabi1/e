import { describe, expect, it } from "vitest";
import { computeProRataUnservedUsd } from "@/lib/sponsorships/withdrawal";

describe("pro-rata withdrawal refund (section 6 default policy)", () => {
  it("refunds the full amount if withdrawn at the very start of the term", () => {
    const termStart = new Date("2026-01-01");
    const termEnd = new Date("2026-07-01");
    const amount = computeProRataUnservedUsd({ amountUsd: 200, termStart, termEnd, now: termStart });
    expect(amount).toBe(200);
  });

  it("refunds nothing if withdrawn after the term has fully elapsed", () => {
    const termStart = new Date("2026-01-01");
    const termEnd = new Date("2026-07-01");
    const amount = computeProRataUnservedUsd({ amountUsd: 200, termStart, termEnd, now: new Date("2026-08-01") });
    expect(amount).toBe(0);
  });

  it("refunds roughly half when withdrawn at the midpoint of the term", () => {
    const termStart = new Date("2026-01-01");
    const termEnd = new Date("2026-07-01"); // ~181 days
    const midpoint = new Date("2026-04-02"); // ~91 days in
    const amount = computeProRataUnservedUsd({ amountUsd: 200, termStart, termEnd, now: midpoint });
    expect(amount).toBeGreaterThan(90);
    expect(amount).toBeLessThan(110);
  });

  it("a racer stopping mid-June on a season deal gets a partial, not zero and not full, refund", () => {
    const termStart = new Date("2026-03-01");
    const termEnd = new Date("2026-09-01");
    const stoppedJune15 = new Date("2026-06-15");
    const amount = computeProRataUnservedUsd({ amountUsd: 300, termStart, termEnd, now: stoppedJune15 });
    expect(amount).toBeGreaterThan(0);
    expect(amount).toBeLessThan(300);
  });
});
