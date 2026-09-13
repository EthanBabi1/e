import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { racers, raceSessions, results, series, seriesRounds } from "@/db/schema";
import { racerPublicView, type RawRacerRecord } from "@/lib/minors";

export interface StandingsRow {
  racer: ReturnType<typeof racerPublicView>;
  roundPoints: number[];
  totalPoints: number;
}

/**
 * Section 5: "Standings calculate automatically as results publish."
 * Recomputed on demand from the results table (not incrementally
 * maintained) — a series has few enough rounds/racers that a full
 * recompute is cheap, and it means a corrected result always produces
 * correct standings with no separate reconciliation step.
 */
export async function computeStandings(seriesId: string, className: string): Promise<StandingsRow[]> {
  const [seriesRow] = await db.select().from(series).where(eq(series.id, seriesId));
  if (!seriesRow) throw new Error("Series not found");

  const rounds = await db.select().from(seriesRounds).where(eq(seriesRounds.seriesId, seriesId));
  const eventIds = rounds.map((r) => r.eventId);
  if (eventIds.length === 0) return [];

  const rows = await db
    .select({ racerId: results.racerId, points: results.points, eventId: raceSessions.eventId, roundNumber: seriesRounds.roundNumber })
    .from(results)
    .innerJoin(raceSessions, eq(results.sessionId, raceSessions.id))
    .innerJoin(seriesRounds, eq(seriesRounds.eventId, raceSessions.eventId))
    .where(
      and(
        eq(seriesRounds.seriesId, seriesId),
        eq(raceSessions.className, className),
        eq(raceSessions.type, "race"),
        isNotNull(results.publishedAt),
        isNotNull(results.racerId)
      )
    );

  const byRacer = new Map<string, Map<number, number>>();
  for (const row of rows) {
    if (!row.racerId || row.points == null) continue;
    const roundMap = byRacer.get(row.racerId) ?? new Map<number, number>();
    roundMap.set(row.roundNumber, (roundMap.get(row.roundNumber) ?? 0) + row.points);
    byRacer.set(row.racerId, roundMap);
  }

  const racerIds = [...byRacer.keys()];
  if (racerIds.length === 0) return [];
  const racerRows = await db.select().from(racers).where(inArray(racers.id, racerIds));
  const racerById = new Map(racerRows.map((r) => [r.id, r]));

  const standings: StandingsRow[] = [];
  for (const [racerId, roundMap] of byRacer) {
    const racer = racerById.get(racerId);
    if (!racer) continue;
    const roundPoints = [...roundMap.values()].sort((a, b) => b - a);
    const kept = seriesRow.dropScores > 0 ? roundPoints.slice(0, Math.max(0, roundPoints.length - seriesRow.dropScores)) : roundPoints;
    const totalPoints = kept.reduce((a, b) => a + b, 0);
    standings.push({ racer: racerPublicView(racer as unknown as RawRacerRecord), roundPoints, totalPoints });
  }

  return standings.sort((a, b) => b.totalPoints - a.totalPoints);
}
