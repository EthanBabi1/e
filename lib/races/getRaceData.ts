import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { events, raceSessions, results, racers, tracks } from "@/db/schema";
import { racerPublicView, type RawRacerRecord } from "@/lib/minors";

export async function getRaceBySessionId(sessionId: string) {
  const [session] = await db.select().from(raceSessions).where(eq(raceSessions.id, sessionId));
  if (!session) return null;

  const [event] = await db.select().from(events).where(eq(events.id, session.eventId));
  const [track] = event ? await db.select().from(tracks).where(eq(tracks.id, event.trackId)) : [null];

  const rows = await db
    .select({ result: results, racer: racers })
    .from(results)
    .leftJoin(racers, eq(results.racerId, racers.id))
    .where(and(eq(results.sessionId, sessionId), isNotNull(results.publishedAt)))
    .orderBy(asc(results.position));

  return {
    session,
    event,
    track,
    rows: rows.map((r) => ({
      result: r.result,
      racer: r.racer ? racerPublicView(r.racer as unknown as RawRacerRecord) : null,
    })),
  };
}
