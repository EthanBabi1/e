import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { events, ingestBatches, raceSessions, results } from "@/db/schema";
import { createGhostRacer } from "./ghostRacer";
import { recomputeAllRatings } from "@/lib/ratings/recompute";

export interface PublishDecision {
  resultId: string;
  /** An existing racer id to attach, or null to create a new ghost profile
   * from this row's parsed name (section 3's matching/review flow). */
  racerId: string | null;
}

/**
 * The one place every ingest path (B/C/D, and A once enabled) converges:
 * takes the human-reviewed decisions from the shared review screen and
 * commits them — creating ghost profiles for unmatched names, attaching
 * racerId, and flipping publishedAt so the rows become visible to public
 * pages and eligible for rating movement. Never called with unreviewed
 * data — the caller (review screen action) is responsible for having run
 * validateSessionRows first and blocking on any "block"-severity issue.
 */
export async function publishIngestBatch(batchId: string, decisions: PublishDecision[]) {
  const [batch] = await db.select().from(ingestBatches).where(eq(ingestBatches.id, batchId));
  if (!batch) throw new Error(`Ingest batch ${batchId} not found`);

  const rows = await db
    .select({
      id: results.id,
      driverNameRaw: results.driverNameRaw,
      kartNumber: results.kartNumber,
      className: raceSessions.className,
      trackId: events.trackId,
    })
    .from(results)
    .innerJoin(raceSessions, eq(results.sessionId, raceSessions.id))
    .innerJoin(events, eq(raceSessions.eventId, events.id))
    .where(
      inArray(
        results.id,
        decisions.map((d) => d.resultId)
      )
    );

  const rowById = new Map(rows.map((r) => [r.id, r]));
  let ghostsCreated = 0;

  for (const decision of decisions) {
    const row = rowById.get(decision.resultId);
    if (!row) continue;

    let racerId = decision.racerId;
    if (!racerId) {
      if (!row.driverNameRaw) {
        throw new Error(`Result ${decision.resultId} has no parsed name to create a ghost profile from`);
      }
      const ghost = await createGhostRacer({
        fullName: row.driverNameRaw,
        trackId: row.trackId,
        className: row.className,
        kartNumber: row.kartNumber,
      });
      racerId = ghost.id;
      ghostsCreated++;
    }

    await db
      .update(results)
      .set({ racerId, publishedAt: new Date() })
      .where(eq(results.id, decision.resultId));
  }

  await db.update(ingestBatches).set({ status: "published" }).where(eq(ingestBatches.id, batchId));

  // Synchronous full recompute — fine at this scale (see DECISIONS.md);
  // the first thing to change if this becomes a bottleneck is making this
  // a queued job rather than an inline call on the publish request.
  await recomputeAllRatings();

  return { published: decisions.length, ghostsCreated };
}
