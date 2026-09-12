import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { racers, ratings } from "@/db/schema";
import { racerPublicView, type RawRacerRecord } from "@/lib/minors";

export interface LeaderboardEntry {
  racer: ReturnType<typeof racerPublicView>;
  mu: number;
  sigma: number;
  rankedResultCount: number;
}

/**
 * Leaderboards only include racers past the provisional threshold (section
 * 8) — enforced here at the query level via `eq(ratings.isProvisional,
 * false)`, not filtered client-side, so there is no code path that can
 * accidentally render a provisional rating on a public leaderboard.
 */
export async function getLeaderboard(params: {
  className: string;
  trackId?: string;
  limit?: number;
}): Promise<LeaderboardEntry[]> {
  const conditions = [eq(ratings.className, params.className), eq(ratings.isProvisional, false)];
  if (params.trackId) conditions.push(eq(racers.homeTrackId, params.trackId));

  const rows = await db
    .select({
      racer: racers,
      mu: ratings.mu,
      sigma: ratings.sigma,
      rankedResultCount: ratings.rankedResultCount,
    })
    .from(ratings)
    .innerJoin(racers, eq(ratings.racerId, racers.id))
    .where(and(...conditions))
    .orderBy(desc(ratings.mu))
    .limit(params.limit ?? 50);

  return rows.map((r) => ({
    racer: racerPublicView(r.racer as unknown as RawRacerRecord),
    mu: r.mu,
    sigma: r.sigma,
    rankedResultCount: r.rankedResultCount,
  }));
}
