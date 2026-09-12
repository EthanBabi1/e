import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { events, raceSessions, results, racers, tracks } from "@/db/schema";
import { RANKED_PROVENANCE } from "@/lib/ratings/provenance";
import { racerPublicView, type RawRacerRecord } from "@/lib/minors";

export async function getTrackBySlug(slug: string) {
  const [track] = await db.select().from(tracks).where(eq(tracks.slug, slug));
  return track ?? null;
}

/** Track records per class — prestige, drives return visits (section 5). */
export async function getTrackRecords(trackId: string) {
  const rows = await db
    .select({
      className: raceSessions.className,
      bestLapMs: sql<number>`min(${results.bestLapMs})`,
    })
    .from(results)
    .innerJoin(raceSessions, eq(results.sessionId, raceSessions.id))
    .innerJoin(events, eq(raceSessions.eventId, events.id))
    .where(
      and(
        eq(events.trackId, trackId),
        eq(raceSessions.type, "race"),
        inArray(results.provenance, [...RANKED_PROVENANCE]),
        isNotNull(results.publishedAt),
        isNotNull(results.bestLapMs)
      )
    )
    .groupBy(raceSessions.className);
  return rows;
}

export async function getRoster(trackId: string) {
  const rows = await db.select().from(racers).where(eq(racers.homeTrackId, trackId));
  return rows.map((r) => racerPublicView(r as unknown as RawRacerRecord));
}

export async function getLatestResults(trackId: string, limit = 10) {
  const rows = await db
    .select({
      resultId: results.id,
      racerId: results.racerId,
      position: results.position,
      className: raceSessions.className,
      eventName: events.name,
      eventDate: events.date,
    })
    .from(results)
    .innerJoin(raceSessions, eq(results.sessionId, raceSessions.id))
    .innerJoin(events, eq(raceSessions.eventId, events.id))
    .where(and(eq(events.trackId, trackId), eq(raceSessions.type, "race"), isNotNull(results.publishedAt)))
    .orderBy(desc(events.date))
    .limit(limit);
  return rows;
}
