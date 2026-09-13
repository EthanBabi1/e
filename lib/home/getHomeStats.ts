import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { racers, results, tracks, zoneListings } from "@/db/schema";

/**
 * Section 1's "sparse marketplace framed as curation" applies to the
 * homepage too — these are real counts, never invented ones, and the
 * homepage copy is written to read honestly whether they're 0 or 1000.
 */
export async function getHomeStats() {
  const [racerRow] = await db.select({ count: sql<number>`count(*)` }).from(racers);
  const [resultRow] = await db.select({ count: sql<number>`count(*)` }).from(results).where(sql`${results.publishedAt} is not null`);
  const [trackRow] = await db.select({ count: sql<number>`count(*)` }).from(tracks);
  const [listingRow] = await db.select({ count: sql<number>`count(*)` }).from(zoneListings).where(sql`${zoneListings.isActive} = true`);

  return {
    racerCount: Number(racerRow?.count ?? 0),
    publishedResultCount: Number(resultRow?.count ?? 0),
    trackCount: Number(trackRow?.count ?? 0),
    activeListingCount: Number(listingRow?.count ?? 0),
  };
}
