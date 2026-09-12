import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { events, raceSessions, results } from "@/db/schema";
import { RANKED_PROVENANCE } from "@/lib/ratings/provenance";

/** Current track record for a class — only counts verified, published results. */
export async function getTrackRecordMs(trackId: string, className: string): Promise<number | null> {
  const [row] = await db
    .select({ best: sql<number | null>`min(${results.bestLapMs})` })
    .from(results)
    .innerJoin(raceSessions, eq(results.sessionId, raceSessions.id))
    .innerJoin(events, eq(raceSessions.eventId, events.id))
    .where(
      and(
        eq(events.trackId, trackId),
        eq(raceSessions.className, className),
        inArray(results.provenance, [...RANKED_PROVENANCE]),
        isNotNull(results.publishedAt),
        isNotNull(results.bestLapMs)
      )
    );
  return row?.best ?? null;
}
