import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { bids, zoneListings } from "@/db/schema";
import { CONFIG } from "@/lib/config";

export type PlaceBidResult =
  | { status: "accepted"; bidId: string; newClosesAt: Date | null }
  | { status: "too_low"; currentHighUsd: number }
  | { status: "listing_closed" }
  | { status: "listing_not_found" };

/**
 * DoD requirement (section 16): "bid concurrency (two simultaneous bids
 * must not both win at one price — row-level locking)." The whole
 * read-current-highest / validate / insert sequence runs inside one
 * transaction with `SELECT ... FOR UPDATE` on the listing row, which
 * serializes concurrent bid attempts on the same listing — the second of
 * two simultaneous requests waits for the first transaction to commit,
 * then re-reads the now-current highest bid rather than the stale value
 * it would have seen without the lock. See
 * tests/integration/bid-concurrency.test.ts.
 */
export async function placeBid(params: { listingId: string; sponsorUserId: string; amountUsd: number; stripeSetupIntentId?: string }): Promise<PlaceBidResult> {
  return db.transaction(async (tx) => {
    const [listing] = await tx.select().from(zoneListings).where(eq(zoneListings.id, params.listingId)).for("update");
    if (!listing) return { status: "listing_not_found" };
    if (!listing.isActive) return { status: "listing_closed" };
    if (listing.closesAt && listing.closesAt.getTime() < Date.now()) return { status: "listing_closed" };

    const [highestBid] = await tx
      .select()
      .from(bids)
      .where(eq(bids.listingId, params.listingId))
      .orderBy(desc(bids.amountUsd))
      .limit(1);

    const currentHighUsd = highestBid?.amountUsd ?? listing.startingBidUsd ?? 0;
    const minimumNextBid = highestBid ? currentHighUsd + 1 : currentHighUsd;

    if (params.amountUsd < minimumNextBid) {
      return { status: "too_low", currentHighUsd };
    }

    const [bid] = await tx
      .insert(bids)
      .values({
        listingId: params.listingId,
        sponsorUserId: params.sponsorUserId,
        amountUsd: params.amountUsd,
        stripeSetupIntentId: params.stripeSetupIntentId,
      })
      .returning();

    // Anti-snipe (section EXISTING CODE): a bid inside the final 5 minutes
    // extends the close by 5 minutes.
    let newClosesAt: Date | null = listing.closesAt;
    if (listing.closesAt) {
      const msRemaining = listing.closesAt.getTime() - Date.now();
      const windowMs = CONFIG.antiSnipeWindowMinutes * 60 * 1000;
      if (msRemaining < windowMs) {
        newClosesAt = new Date(Date.now() + CONFIG.antiSnipeExtensionMinutes * 60 * 1000);
        await tx.update(zoneListings).set({ closesAt: newClosesAt }).where(eq(zoneListings.id, params.listingId));
      }
    }

    return { status: "accepted", bidId: bid.id, newClosesAt };
  });
}
