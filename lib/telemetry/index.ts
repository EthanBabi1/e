import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { events, laps, raceSessions, results, tracks } from "@/db/schema";
import { RANKED_PROVENANCE } from "@/lib/ratings/provenance";

/**
 * Standard deviation of lap times within a single race — section 4:
 * "Consistency score... genuinely meaningful and nobody else shows it."
 * Null below 3 laps; a stdev on two data points isn't a signal worth
 * showing.
 */
export function consistencyStdevMs(lapTimesMs: number[]): number | null {
  if (lapTimesMs.length < 3) return null;
  const mean = lapTimesMs.reduce((a, b) => a + b, 0) / lapTimesMs.length;
  const variance = lapTimesMs.reduce((sum, t) => sum + (t - mean) ** 2, 0) / lapTimesMs.length;
  return Math.sqrt(variance);
}

export interface SeasonResultRow {
  resultId: string;
  sessionId: string;
  date: string;
  trackName: string;
  trackId: string;
  eventName: string;
  sessionType: "practice" | "qualifying" | "race";
  className: string;
  position: number | null;
  laps: number | null;
  bestLapMs: number | null;
  totalTimeMs: number | null;
  status: "finished" | "dnf" | "dns" | "dq";
  provenance: string;
  points: number | null;
}

/** A racer's full published record, newest first — feeds the record
 * table, form-guide strip, and telemetry chart. */
export async function getRacerResults(racerId: string): Promise<SeasonResultRow[]> {
  const rows = await db
    .select({
      resultId: results.id,
      sessionId: results.sessionId,
      date: events.date,
      trackName: tracks.name,
      trackId: tracks.id,
      eventName: events.name,
      sessionType: raceSessions.type,
      className: raceSessions.className,
      position: results.position,
      laps: results.laps,
      bestLapMs: results.bestLapMs,
      totalTimeMs: results.totalTimeMs,
      status: results.status,
      provenance: results.provenance,
      points: results.points,
      publishedAt: results.publishedAt,
    })
    .from(results)
    .innerJoin(raceSessions, eq(results.sessionId, raceSessions.id))
    .innerJoin(events, eq(raceSessions.eventId, events.id))
    .innerJoin(tracks, eq(events.trackId, tracks.id))
    .where(and(eq(results.racerId, racerId), isNotNull(results.publishedAt)))
    .orderBy(asc(events.date));

  return rows.reverse();
}

export async function getLapProgression(racerId: string, trackId: string, className: string) {
  const rows = await db
    .select({ lapNumber: laps.lapNumber, lapTimeMs: laps.lapTimeMs, resultId: laps.resultId, date: events.date })
    .from(laps)
    .innerJoin(results, eq(laps.resultId, results.id))
    .innerJoin(raceSessions, eq(results.sessionId, raceSessions.id))
    .innerJoin(events, eq(raceSessions.eventId, events.id))
    .where(
      and(
        eq(results.racerId, racerId),
        eq(events.trackId, trackId),
        eq(raceSessions.className, className),
        eq(raceSessions.type, "race"),
        isNotNull(results.publishedAt)
      )
    )
    .orderBy(asc(events.date), asc(laps.lapNumber));
  return rows;
}

export async function getPersonalBestByTrack(racerId: string): Promise<Map<string, number>> {
  const rows = await getRacerResults(racerId);
  const bests = new Map<string, number>();
  for (const r of rows) {
    if (r.bestLapMs == null) continue;
    const current = bests.get(r.trackId);
    if (current == null || r.bestLapMs < current) bests.set(r.trackId, r.bestLapMs);
  }
  return bests;
}

/** Class median best lap at a track — comparison line on the telemetry
 * chart (section 4). Only counts verified, published results. */
export async function getClassMedianBestLapMs(trackId: string, className: string): Promise<number | null> {
  const rows = await db
    .select({ bestLapMs: results.bestLapMs })
    .from(results)
    .innerJoin(raceSessions, eq(results.sessionId, raceSessions.id))
    .innerJoin(events, eq(raceSessions.eventId, events.id))
    .where(
      and(
        eq(events.trackId, trackId),
        eq(raceSessions.className, className),
        eq(raceSessions.type, "race"),
        inArray(results.provenance, [...RANKED_PROVENANCE]),
        isNotNull(results.publishedAt),
        isNotNull(results.bestLapMs)
      )
    );
  const values = rows.map((r) => r.bestLapMs!).sort((a, b) => a - b);
  if (values.length === 0) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
}
