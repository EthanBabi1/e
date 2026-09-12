import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { racers, ratings, tracks, zoneListings, zones } from "@/db/schema";
import { racerPublicView, type RawRacerRecord } from "@/lib/minors";
import { getRacerResults, getLapProgression, getClassMedianBestLapMs, consistencyStdevMs } from "@/lib/telemetry";
import { computeHeadlineStats } from "@/lib/profile/headlineStats";

export async function getProfileDataBySlug(slug: string) {
  const [racer] = await db.select().from(racers).where(eq(racers.slug, slug));
  if (!racer) return null;
  return getProfileDataForRacer(racer);
}

export async function getProfileDataForRacer(racer: typeof racers.$inferSelect) {
  const view = racerPublicView(racer as unknown as RawRacerRecord);
  const results = await getRacerResults(racer.id);
  const headlineStats = computeHeadlineStats(results);

  let homeTrackName: string | null = null;
  if (racer.homeTrackId) {
    const [track] = await db.select({ name: tracks.name }).from(tracks).where(eq(tracks.id, racer.homeTrackId));
    homeTrackName = track?.name ?? null;
  }

  let rating: { mu: number; sigma: number; isProvisional: boolean; className: string } | null = null;
  if (racer.classDefault) {
    const [r] = await db
      .select()
      .from(ratings)
      .where(eq(ratings.racerId, racer.id));
    if (r) rating = { mu: r.mu, sigma: r.sigma, isProvisional: r.isProvisional, className: r.className };
  }

  let laps: Awaited<ReturnType<typeof getLapProgression>> = [];
  let classMedianMs: number | null = null;
  const mostRecentRace = results.find((r) => r.sessionType === "race");
  if (racer.homeTrackId && racer.classDefault) {
    laps = await getLapProgression(racer.id, racer.homeTrackId, racer.classDefault);
    classMedianMs = await getClassMedianBestLapMs(racer.homeTrackId, racer.classDefault);
  }

  const openZonesRaw = await db
    .select({ zoneName: zones.name, tier: zones.tier, priceUsd: zoneListings.priceUsd, guardianApprovedAt: zoneListings.guardianApprovedAt })
    .from(zoneListings)
    .innerJoin(zones, eq(zoneListings.zoneId, zones.id))
    .where(and(eq(zones.racerId, racer.id), eq(zoneListings.isActive, true)));
  // A minor's zone stays private until a guardian has approved it for
  // public listing (section 2) — the same gate marketplace queries apply.
  const openZones = openZonesRaw.filter((z) => !racer.isMinor || z.guardianApprovedAt != null);

  const mostRecentRaceLaps = mostRecentRace
    ? laps.filter((l) => l.resultId === mostRecentRace.resultId).map((l) => l.lapTimeMs)
    : [];
  const consistencyMs = consistencyStdevMs(mostRecentRaceLaps);

  return {
    racer,
    view,
    results,
    headlineStats,
    homeTrackName,
    rating,
    laps,
    classMedianMs,
    consistencyMs,
    openZones,
  };
}

export type ProfileData = NonNullable<Awaited<ReturnType<typeof getProfileDataForRacer>>>;
