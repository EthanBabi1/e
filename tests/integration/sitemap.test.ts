import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { racers } from "@/db/schema";
import sitemap from "@/app/sitemap";

const RUN = process.env.DATABASE_URL ? describe : describe.skip;

RUN("sitemap — no unclaimed minor exposed (section 3 DoD requirement)", () => {
  let unclaimedMinorId: string;
  let claimedMinorId: string;
  let unclaimedAdultId: string;

  beforeAll(async () => {
    const suffix = Date.now();
    const [minor] = await db
      .insert(racers)
      .values({ slug: `sitemap-minor-${suffix}`, firstName: "Test", lastName: "Minor", isMinor: true, claimStatus: "unclaimed" })
      .returning();
    unclaimedMinorId = minor.id;

    const [claimedMinor] = await db
      .insert(racers)
      .values({ slug: `sitemap-claimed-minor-${suffix}`, firstName: "Test", lastName: "ClaimedMinor", isMinor: true, claimStatus: "claimed" })
      .returning();
    claimedMinorId = claimedMinor.id;

    const [adult] = await db
      .insert(racers)
      .values({ slug: `sitemap-adult-${suffix}`, firstName: "Test", lastName: "Adult", isMinor: false, claimStatus: "unclaimed" })
      .returning();
    unclaimedAdultId = adult.id;
  });

  afterAll(async () => {
    await db.delete(racers).where(eq(racers.id, unclaimedMinorId));
    await db.delete(racers).where(eq(racers.id, claimedMinorId));
    await db.delete(racers).where(eq(racers.id, unclaimedAdultId));
  });

  it("never includes an unclaimed minor's profile", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    const [minor] = await db.select().from(racers).where(eq(racers.id, unclaimedMinorId));
    expect(urls).not.toContain(`https://podiumrow.example/racers/${minor.slug}`);
  });

  it("never includes a claimed minor's profile either (this build's extra-conservative choice)", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    const [claimedMinor] = await db.select().from(racers).where(eq(racers.id, claimedMinorId));
    expect(urls).not.toContain(`https://podiumrow.example/racers/${claimedMinor.slug}`);
  });

  it("includes an unclaimed ADULT ghost profile — ordinary, per section 3", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    const [adult] = await db.select().from(racers).where(eq(racers.id, unclaimedAdultId));
    expect(urls).toContain(`https://podiumrow.example/racers/${adult.slug}`);
  });
});
