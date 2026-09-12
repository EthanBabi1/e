import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { racers } from "@/db/schema";
import { searchRacers } from "@/lib/search";

const RUN = process.env.DATABASE_URL ? describe : describe.skip;

RUN("search — typo tolerance (section 9 DoD requirement)", () => {
  let racerId: string;

  beforeAll(async () => {
    const [racer] = await db
      .insert(racers)
      .values({
        slug: `search-test-${Date.now()}`,
        firstName: "Kristopher",
        lastName: "Fennimore",
        isMinor: true, // deliberately a minor — an unclaimed ghost profile
        classDefault: "Cadet",
        claimStatus: "unclaimed",
        isFictionalDemo: true,
      })
      .returning();
    racerId = racer.id;
  });

  afterAll(async () => {
    await db.delete(racers).where(eq(racers.id, racerId));
  });

  it("finds a ghost profile by a misspelled name", async () => {
    // "Christopher Fenimore" — two typos against "Kristopher Fennimore".
    const hits = await searchRacers("Christopher Fenimore");
    expect(hits.map((h) => h.racer.id)).toContain(racerId);
  });

  it("still redacts the unclaimed minor's name in the search result (first name + last initial only)", async () => {
    const hits = await searchRacers("Kristopher Fennimore");
    const hit = hits.find((h) => h.racer.id === racerId);
    expect(hit).toBeDefined();
    expect(hit!.racer.displayName).toBe("Kristopher F.");
    expect(hit!.racer.displayName).not.toContain("Fennimore");
  });

  it("returns nothing for a completely unrelated query", async () => {
    const hits = await searchRacers("zzz-nonexistent-query-zzz");
    expect(hits.map((h) => h.racer.id)).not.toContain(racerId);
  });
});
