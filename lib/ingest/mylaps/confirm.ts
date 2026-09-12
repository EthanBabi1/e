import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { events, laps, raceSessions, results, tracks } from "@/db/schema";
import type { MylapsFixtureSession } from "./fixtures";

async function findOrCreateTrack(name: string) {
  const [existing] = await db.select().from(tracks).where(eq(tracks.name, name));
  if (existing) return existing;
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const [created] = await db.insert(tracks).values({ slug, name, isFictionalDemo: name.includes("(demo)") }).returning();
  return created;
}

async function findOrCreateEvent(trackId: string, name: string, date: string) {
  const [existing] = await db.select().from(events).where(and(eq(events.trackId, trackId), eq(events.name, name), eq(events.date, date)));
  if (existing) return existing;
  const [created] = await db.insert(events).values({ trackId, name, date, isFictionalDemo: false }).returning();
  return created;
}

async function findOrCreateSession(eventId: string, type: MylapsFixtureSession["sessionType"], className: string) {
  const [existing] = await db
    .select()
    .from(raceSessions)
    .where(and(eq(raceSessions.eventId, eventId), eq(raceSessions.type, type), eq(raceSessions.className, className)));
  if (existing) return existing;
  const [created] = await db.insert(raceSessions).values({ eventId, type, className }).returning();
  return created;
}

/**
 * Racer has confirmed "yes, these are my sessions" (section 3). Transponder
 * data is trusted by construction — no separate matching/review step, just
 * identity confirmation — so this publishes immediately with
 * transponder_verified provenance and idempotent upstream refs so a re-sync
 * never double-inserts the same session.
 */
export async function confirmAndImportMylapsSessions(racerId: string, sessions: MylapsFixtureSession[]) {
  let imported = 0;
  let skippedDuplicates = 0;

  for (const session of sessions) {
    const track = await findOrCreateTrack(session.trackName);
    const event = await findOrCreateEvent(track.id, session.eventName, session.eventDate);
    const raceSession = await findOrCreateSession(event.id, session.sessionType, session.className);

    const [existingResult] = await db
      .select()
      .from(results)
      .where(and(eq(results.sessionId, raceSession.id), eq(results.racerId, racerId)));
    if (existingResult) {
      skippedDuplicates++;
      continue; // idempotent re-sync — already imported this exact session for this racer
    }

    const lapTimes = session.laps.map((l) => l.lapTimeMs);
    const totalTimeMs = lapTimes.length ? lapTimes.reduce((a, b) => a + b, 0) : null;
    const bestLapMs = lapTimes.length ? Math.min(...lapTimes) : null;

    const [result] = await db
      .insert(results)
      .values({
        sessionId: raceSession.id,
        racerId,
        laps: session.laps.length,
        bestLapMs,
        totalTimeMs,
        position: session.position,
        status: session.status,
        provenance: "transponder_verified",
        ingestPath: "mylaps",
        sourceRef: {
          upstreamEventId: session.upstreamEventId,
          upstreamSessionId: session.upstreamSessionId,
          upstreamResultId: session.upstreamResultId,
        },
        publishedAt: new Date(),
      })
      .returning();

    if (session.laps.length) {
      await db.insert(laps).values(session.laps.map((l) => ({ resultId: result.id, lapNumber: l.lapNumber, lapTimeMs: l.lapTimeMs })));
    }
    imported++;
  }

  return { imported, skippedDuplicates };
}
