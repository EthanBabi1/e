import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { analyticsEvents, racers, tracks, zoneListings } from "@/db/schema";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

async function countEvent(eventType: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(analyticsEvents)
    .where(sql`${analyticsEvents.eventType} = ${eventType}`);
  return Number(row?.count ?? 0);
}

/**
 * Section 13: "Build the metrics dashboard in Phase 3, not Phase 6."
 * Several funnel stages (claim rate, Pro conversion, GMV, sponsor
 * retention) have no real trigger point yet — those events don't exist
 * until Phase 4/5 build the flows that fire them. This dashboard shows
 * what's measurable today and is structured so later phases only need to
 * add rows, not redesign the page.
 */
export default async function AdminMetricsPage() {
  await requireAdmin();

  const [ghostProfilesCreated, resultsPublished] = await Promise.all([
    countEvent(ANALYTICS_EVENTS.GHOST_PROFILE_CREATED),
    countEvent(ANALYTICS_EVENTS.RESULTS_PUBLISHED),
  ]);

  const [racerCount] = await db.select({ count: sql<number>`count(*)` }).from(racers);
  const [claimedCount] = await db.select({ count: sql<number>`count(*)` }).from(racers).where(sql`${racers.claimStatus} = 'claimed'`);
  const [trackCount] = await db.select({ count: sql<number>`count(*)` }).from(tracks);
  const [activeListingCount] = await db.select({ count: sql<number>`count(*)` }).from(zoneListings).where(sql`${zoneListings.isActive} = true`);

  const claimRate = racerCount.count > 0 ? ((claimedCount.count / racerCount.count) * 100).toFixed(1) : "—";

  const rows = [
    { label: "Ghost profiles created", value: ghostProfilesCreated, done: true },
    { label: "Racers total", value: racerCount.count, done: true },
    { label: "Claimed profiles", value: claimedCount.count, done: true },
    { label: "Claim rate", value: `${claimRate}%`, done: true },
    { label: "Results published (event log)", value: resultsPublished, done: true },
    { label: "Tracks", value: trackCount.count, done: true },
    { label: "Zones listed (active)", value: activeListingCount.count, done: true },
    { label: "First zone listed → first sale, time to first sale", value: "—", done: false, note: "needs Phase 5 checkout" },
    { label: "Free → Pro conversion, Pro renewal", value: "—", done: false, note: "needs Phase 5 subscriptions" },
    { label: "GMV, take-rate revenue, subscription MRR", value: "—", done: false, note: "needs Phase 5 payments" },
    { label: "Repeat sponsorship rate, sponsor retention", value: "—", done: false, note: "needs Phase 5 sponsorships" },
    { label: "Racer retention season over season", value: "—", done: false, note: "needs a second season of real data" },
  ];

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <p className="label-small mb-2">Admin</p>
      <h1 className="font-display text-4xl mb-8">Platform metrics</h1>
      <table className="w-full text-sm border-collapse">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-mist">
              <td className="py-3 pr-4">
                {row.label}
                {!row.done && <span className="block text-xs text-silver mt-0.5">{row.note}</span>}
              </td>
              <td className="py-3 tabular text-right font-mono-tabular">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
