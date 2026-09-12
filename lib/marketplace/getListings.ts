import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { racers, tracks, zoneListings, zones } from "@/db/schema";
import { racerPublicView, type RawRacerRecord } from "@/lib/minors";
import { distanceMiles } from "@/lib/geo/distance";

export interface MarketplaceListing {
  listingId: string;
  zoneName: string;
  tier: string;
  priceUsd: number | null;
  racer: ReturnType<typeof racerPublicView>;
  trackName: string | null;
  trackLat: number | null;
  trackLng: number | null;
}

/**
 * Section 9/11: "'Sponsor a racer near you.' Geographic discovery as the
 * default marketplace view, not a filter." Active listings only, joined
 * back to the racer's public (redacted) view — a minor's zone never
 * appears here without a guardian's prior approval (guardianApprovedAt),
 * which section 2 makes a precondition for public visibility at all.
 */
export async function getActiveListings(params: { originLat?: number; originLng?: number } = {}) {
  const rows = await db
    .select({
      listingId: zoneListings.id,
      priceUsd: zoneListings.priceUsd,
      zoneName: zones.name,
      tier: zones.tier,
      racer: racers,
      trackName: tracks.name,
      trackLat: tracks.lat,
      trackLng: tracks.lng,
      guardianApprovedAt: zoneListings.guardianApprovedAt,
      isMinor: racers.isMinor,
    })
    .from(zoneListings)
    .innerJoin(zones, eq(zoneListings.zoneId, zones.id))
    .innerJoin(racers, eq(zones.racerId, racers.id))
    .leftJoin(tracks, eq(racers.homeTrackId, tracks.id))
    .where(eq(zoneListings.isActive, true));

  // A minor's zone cannot be listed publicly until a guardian has approved
  // it (section 2) — enforced here as a second gate even though seed data
  // never creates an unapproved minor listing today.
  const visible = rows.filter((r) => !r.isMinor || r.guardianApprovedAt != null);

  const listings: (MarketplaceListing & { distanceMi: number | null })[] = visible.map((r) => ({
    listingId: r.listingId,
    zoneName: r.zoneName,
    tier: r.tier,
    priceUsd: r.priceUsd,
    racer: racerPublicView(r.racer as unknown as RawRacerRecord),
    trackName: r.trackName,
    trackLat: r.trackLat,
    trackLng: r.trackLng,
    distanceMi:
      params.originLat != null && params.originLng != null && r.trackLat != null && r.trackLng != null
        ? distanceMiles({ lat: params.originLat, lng: params.originLng }, { lat: r.trackLat, lng: r.trackLng })
        : null,
  }));

  if (params.originLat != null) {
    listings.sort((a, b) => (a.distanceMi ?? Infinity) - (b.distanceMi ?? Infinity));
  }

  return listings;
}
