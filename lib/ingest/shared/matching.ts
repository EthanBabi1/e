import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { racers } from "@/db/schema";

export interface MatchCandidate {
  racerId: string;
  displayName: string;
  confidence: number; // 0..1
  reasons: string[];
}

export interface MatchResult {
  candidates: MatchCandidate[];
  autoLink: MatchCandidate | null; // confident enough to link automatically (with undo in the UI)
}

const AUTO_LINK_THRESHOLD = 0.82;
const SUGGEST_THRESHOLD = 0.45;

/**
 * Matches a parsed name (from any ingest path) against existing racers at a
 * track, using fuzzy name similarity (pg_trgm) plus kart-number and class
 * agreement as corroborating signal (section 3: "fuzzy name plus
 * kart-number history at that track plus class, with visible confidence").
 * Confident matches auto-link (undo-able in the UI); everything else is
 * either a "did you mean" suggestion or, below the suggest threshold,
 * becomes a ghost profile.
 */
export async function matchRacer(params: {
  trackId: string;
  driverName: string;
  kartNumber?: string | null;
  className?: string | null;
}): Promise<MatchResult> {
  const fullName = params.driverName.trim();
  if (!fullName) return { candidates: [], autoLink: null };

  const rows = await db
    .select({
      id: racers.id,
      firstName: racers.firstName,
      lastName: racers.lastName,
      numberDefault: racers.numberDefault,
      classDefault: racers.classDefault,
      similarity: sql<number>`similarity(${racers.firstName} || ' ' || ${racers.lastName}, ${fullName})`,
    })
    .from(racers)
    .where(
      and(
        eq(racers.homeTrackId, params.trackId),
        sql`similarity(${racers.firstName} || ' ' || ${racers.lastName}, ${fullName}) > 0.2`
      )
    )
    .orderBy(sql`similarity(${racers.firstName} || ' ' || ${racers.lastName}, ${fullName}) desc`)
    .limit(5);

  const candidates: MatchCandidate[] = rows.map((r) => {
    const reasons: string[] = [];
    let confidence = r.similarity * 0.6;
    reasons.push(`name similarity ${(r.similarity * 100).toFixed(0)}%`);

    if (params.kartNumber && r.numberDefault === params.kartNumber) {
      confidence += 0.3;
      reasons.push(`kart #${params.kartNumber} matches this racer's history at this track`);
    }
    if (params.className && r.classDefault === params.className) {
      confidence += 0.1;
      reasons.push(`class "${params.className}" matches`);
    }

    return {
      racerId: r.id,
      displayName: `${r.firstName} ${r.lastName}`,
      confidence: Math.min(1, confidence),
      reasons,
    };
  });

  candidates.sort((a, b) => b.confidence - a.confidence);
  const top = candidates[0];

  return {
    candidates: candidates.filter((c) => c.confidence >= SUGGEST_THRESHOLD),
    autoLink: top && top.confidence >= AUTO_LINK_THRESHOLD ? top : null,
  };
}
