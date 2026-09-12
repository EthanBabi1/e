import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { events, raceSessions, results, ratings, ratingHistory } from "@/db/schema";
import { DEFAULT_RATING, isProvisional, updateRatingsForRace, type RaceParticipant, type RatingState } from "./engine";

// Only these count toward anything ranked (section 8) — self-reported
// results never move a rating or appear on a leaderboard.
const RANKED_PROVENANCE = ["transponder_verified", "track_verified", "source_linked"] as const;

/**
 * Recomputes every rating from scratch, in chronological event order. Safe
 * to re-run any time (idempotent) — it does not incrementally patch state,
 * it rebuilds it, which is the only way to keep this correct as historical
 * results get corrected or re-ingested. Writes one rating_history row per
 * racer/class summarizing the net change of this run (not per-race
 * granularity — with a full rebuild there is no single "the race that
 * caused this delta," so the history is an audit of recompute runs).
 */
export async function recomputeAllRatings() {
  const rows = await db
    .select({
      resultId: results.id,
      racerId: results.racerId,
      position: results.position,
      status: results.status,
      provenance: results.provenance,
      className: raceSessions.className,
      sessionId: raceSessions.id,
      eventDate: events.date,
    })
    .from(results)
    .innerJoin(raceSessions, eq(results.sessionId, raceSessions.id))
    .innerJoin(events, eq(raceSessions.eventId, events.id))
    .where(and(eq(raceSessions.type, "race"), inArray(results.provenance, [...RANKED_PROVENANCE])))
    .orderBy(asc(events.date), asc(raceSessions.id));

  // One race = one race_sessions row (already scoped to a single class).
  const bySession = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!row.racerId) continue; // unmatched ghost row mid-review, skip
    const list = bySession.get(row.sessionId) ?? [];
    list.push(row);
    bySession.set(row.sessionId, list);
  }

  const existingRatings = await db.select().from(ratings);
  const priorState = new Map<string, RatingState>(); // key: `${racerId}::${className}`
  for (const r of existingRatings) {
    priorState.set(`${r.racerId}::${r.className}`, {
      mu: r.mu,
      sigma: r.sigma,
      rankedResultCount: r.rankedResultCount,
    });
  }

  // state[className] -> Map<racerId, RatingState>, starting fresh (a full
  // rebuild, not seeded from priorState, so corrections propagate).
  const state = new Map<string, Map<string, RatingState>>();

  for (const [, sessionRows] of [...bySession.entries()].sort(
    (a, b) => new Date(a[1][0].eventDate).getTime() - new Date(b[1][0].eventDate).getTime()
  )) {
    const className = sessionRows[0].className;
    const classState = state.get(className) ?? new Map<string, RatingState>();

    const participants: RaceParticipant[] = sessionRows.map((r) => ({
      racerId: r.racerId!,
      position: r.position,
      status: r.status as RaceParticipant["status"],
    }));

    const updated = updateRatingsForRace(participants, classState);
    state.set(className, updated);
  }

  for (const [className, classState] of state) {
    for (const [racerId, ratingState] of classState) {
      const [row] = await db
        .insert(ratings)
        .values({
          racerId,
          className,
          mu: ratingState.mu,
          sigma: ratingState.sigma,
          rankedResultCount: ratingState.rankedResultCount,
          isProvisional: isProvisional(ratingState),
        })
        .onConflictDoUpdate({
          target: [ratings.racerId, ratings.className],
          set: {
            mu: ratingState.mu,
            sigma: ratingState.sigma,
            rankedResultCount: ratingState.rankedResultCount,
            isProvisional: isProvisional(ratingState),
            updatedAt: new Date(),
          },
        })
        .returning();

      const prior = priorState.get(`${racerId}::${className}`) ?? DEFAULT_RATING;
      if (prior.mu !== ratingState.mu) {
        await db.insert(ratingHistory).values({
          ratingId: row.id,
          resultId: null,
          muBefore: prior.mu,
          muAfter: ratingState.mu,
          sigmaBefore: prior.sigma,
          sigmaAfter: ratingState.sigma,
        });
      }
    }
  }

  return {
    classesProcessed: state.size,
    racesProcessed: bySession.size,
  };
}
