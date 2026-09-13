import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { bids, racers, users, zoneListings, zones } from "@/db/schema";
import { placeBid } from "@/lib/sponsorships/bidding";

const RUN = process.env.DATABASE_URL ? describe : describe.skip;

/**
 * DoD requirement (section 16): "bid concurrency (two simultaneous bids
 * must not both win at one price — row-level locking)."
 */
RUN("bid concurrency", () => {
  let listingId: string;
  let racerId: string;
  let sponsorIds: Record<"a" | "b" | "c" | "d", string>;

  beforeAll(async () => {
    const suffix = Date.now();
    const [racer] = await db
      .insert(racers)
      .values({ slug: `bid-test-racer-${suffix}`, firstName: "Test", lastName: "Racer", isMinor: false, isFictionalDemo: true })
      .returning();
    racerId = racer.id;

    const sponsorRows = await Promise.all(
      (["a", "b", "c", "d"] as const).map((letter) =>
        db.insert(users).values({ email: `bid-sponsor-${letter}-${suffix}@seed.example`, role: "sponsor" }).returning()
      )
    );
    sponsorIds = { a: sponsorRows[0][0].id, b: sponsorRows[1][0].id, c: sponsorRows[2][0].id, d: sponsorRows[3][0].id };

    const [zone] = await db.insert(zones).values({ racerId, name: "Nose Cone", tier: "premium" }).returning();
    const [listing] = await db
      .insert(zoneListings)
      .values({ zoneId: zone.id, listingType: "auction", term: "season", startingBidUsd: 100, isActive: true, closesAt: new Date(Date.now() + 60 * 60 * 1000) })
      .returning();
    listingId = listing.id;
  });

  afterAll(async () => {
    await db.delete(bids).where(eq(bids.listingId, listingId));
    await db.delete(zoneListings).where(eq(zoneListings.id, listingId));
    await db.delete(zones).where(eq(zones.racerId, racerId));
    await db.delete(racers).where(eq(racers.id, racerId));
    await db.delete(users).where(eq(users.id, sponsorIds.a));
    await db.delete(users).where(eq(users.id, sponsorIds.b));
    await db.delete(users).where(eq(users.id, sponsorIds.c));
    await db.delete(users).where(eq(users.id, sponsorIds.d));
  });

  it("only accepts one of two truly concurrent bids at the exact same amount", async () => {
    const [resultA, resultB] = await Promise.all([
      placeBid({ listingId, sponsorUserId: sponsorIds.a, amountUsd: 150 }),
      placeBid({ listingId, sponsorUserId: sponsorIds.b, amountUsd: 150 }),
    ]);

    const statuses = [resultA.status, resultB.status].sort();
    // Exactly one accepted; the other rejected as too-low against the
    // now-current highest bid the lock forced it to see.
    expect(statuses).toEqual(["accepted", "too_low"]);

    const allBids = await db.select().from(bids).where(eq(bids.listingId, listingId));
    const winningBidsAt150 = allBids.filter((b) => b.amountUsd === 150);
    expect(winningBidsAt150).toHaveLength(1);
  });

  it("rejects a bid that doesn't beat the current high", async () => {
    const result = await placeBid({ listingId, sponsorUserId: sponsorIds.c, amountUsd: 150 });
    expect(result.status).toBe("too_low");
  });

  it("accepts a bid that beats the current high", async () => {
    const result = await placeBid({ listingId, sponsorUserId: sponsorIds.c, amountUsd: 160 });
    expect(result.status).toBe("accepted");
  });

  it("extends the close time when a bid lands inside the anti-snipe window", async () => {
    const [nearCloseZone] = await db.insert(zones).values({ racerId, name: "Front Bumper", tier: "mid" }).returning();
    const originalClose = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes out — inside the 5-minute window
    const [nearCloseListing] = await db
      .insert(zoneListings)
      .values({ zoneId: nearCloseZone.id, listingType: "auction", term: "season", startingBidUsd: 50, isActive: true, closesAt: originalClose })
      .returning();

    const result = await placeBid({ listingId: nearCloseListing.id, sponsorUserId: sponsorIds.d, amountUsd: 60 });
    expect(result.status).toBe("accepted");
    if (result.status === "accepted") {
      expect(result.newClosesAt!.getTime()).toBeGreaterThan(originalClose.getTime());
    }

    await db.delete(bids).where(eq(bids.listingId, nearCloseListing.id));
    await db.delete(zoneListings).where(eq(zoneListings.id, nearCloseListing.id));
    await db.delete(zones).where(eq(zones.id, nearCloseZone.id));
  });
});
