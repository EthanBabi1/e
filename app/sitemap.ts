import type { MetadataRoute } from "next";
import { db } from "@/db/client";
import { racers, tracks } from "@/db/schema";
import { CONFIG } from "@/lib/config";
import { racerPublicView, type RawRacerRecord } from "@/lib/minors";

/**
 * Section 3 hard limit, tested in tests/integration/sitemap.test.ts: no
 * unclaimed under-18 profile appears here — and consistent with
 * lib/minors/redact.ts's own `noindex` field (the single source of truth
 * the profile page's own robots meta tag also reads), rather than
 * re-deriving the same rule with separate logic that could drift out of
 * sync with it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = `https://${CONFIG.domain}`;

  const allRacers = await db.select().from(racers);
  const indexableRacers = allRacers
    .map((r) => racerPublicView(r as unknown as RawRacerRecord))
    .filter((view) => !view.noindex);

  const allTracks = await db.select({ slug: tracks.slug }).from(tracks);

  return [
    { url: base },
    { url: `${base}/marketplace` },
    { url: `${base}/leaderboards` },
    ...indexableRacers.map((r) => ({ url: `${base}/racers/${r.slug}` })),
    ...allTracks.map((t) => ({ url: `${base}/tracks/${t.slug}` })),
  ];
}
