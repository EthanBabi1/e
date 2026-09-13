import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { series, sponsorships, racers, tracks } from "@/db/schema";

export async function getTrackRevenue(trackId: string) {
  const trackRacers = await db.select({ id: racers.id }).from(racers).where(eq(racers.homeTrackId, trackId));
  const racerIds = trackRacers.map((r) => r.id);
  if (racerIds.length === 0) return { gmv: 0, trackShare: 0 };

  const [row] = await db
    .select({
      gmv: sql<number>`coalesce(sum(${sponsorships.amountUsd}), 0)`,
      trackShare: sql<number>`coalesce(sum(${sponsorships.trackRevShareUsd}), 0)`,
    })
    .from(sponsorships)
    .where(inArray(sponsorships.racerId, racerIds));

  return { gmv: Number(row?.gmv ?? 0), trackShare: Number(row?.trackShare ?? 0) };
}

export async function getTrackSeries(trackId: string) {
  return db.select().from(series).where(eq(series.trackId, trackId));
}

export async function getTrackBySlugForPortal(slug: string) {
  const [track] = await db.select().from(tracks).where(eq(tracks.slug, slug));
  return track ?? null;
}
