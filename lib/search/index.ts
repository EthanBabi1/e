import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { racers, tracks } from "@/db/schema";
import { racerPublicView, type RawRacerRecord } from "@/lib/minors";
import { isAccessible } from "@/lib/accounts/deletion";

const SIMILARITY_THRESHOLD = 0.25;

export interface RacerSearchHit {
  racer: ReturnType<typeof racerPublicView>;
  similarity: number;
}

/**
 * Site search across racers (section 9): "A parent typing a slightly wrong
 * spelling must still land on the profile." Trigram similarity, not exact
 * match — and this deliberately runs against unclaimed/ghost profiles too
 * (reachable by search per section 3), always through racerPublicView so
 * an unclaimed minor's redaction still applies to what's returned.
 */
export async function searchRacers(query: string, limit = 10): Promise<RacerSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const rows = await db
    .select({
      racer: racers,
      similarity: sql<number>`greatest(
        similarity(${racers.firstName} || ' ' || ${racers.lastName}, ${q}),
        similarity(coalesce(${racers.numberDefault}, ''), ${q}),
        similarity(coalesce(${racers.town}, ''), ${q})
      )`,
    })
    .from(racers)
    .where(
      sql`greatest(
        similarity(${racers.firstName} || ' ' || ${racers.lastName}, ${q}),
        similarity(coalesce(${racers.numberDefault}, ''), ${q}),
        similarity(coalesce(${racers.town}, ''), ${q})
      ) > ${SIMILARITY_THRESHOLD}`
    )
    .orderBy(sql`greatest(
        similarity(${racers.firstName} || ' ' || ${racers.lastName}, ${q}),
        similarity(coalesce(${racers.numberDefault}, ''), ${q}),
        similarity(coalesce(${racers.town}, ''), ${q})
      ) desc`)
    .limit(limit);

  return rows
    .filter((r) => isAccessible(r.racer))
    .map((r) => ({
      racer: racerPublicView(r.racer as unknown as RawRacerRecord),
      similarity: r.similarity,
    }));
}

export async function searchTracks(query: string, limit = 5) {
  const q = query.trim();
  if (!q) return [];
  return db
    .select({ id: tracks.id, slug: tracks.slug, name: tracks.name, city: tracks.city, region: tracks.region })
    .from(tracks)
    .where(sql`similarity(${tracks.name}, ${q}) > ${SIMILARITY_THRESHOLD}`)
    .orderBy(sql`similarity(${tracks.name}, ${q}) desc`)
    .limit(limit);
}
