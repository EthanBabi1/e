import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { racers, tracks, results, ratings } from "@/db/schema";
import { confidenceBandLabel } from "@/lib/ratings/engine";

/**
 * Phase 1 admin-only data view. NOT auth-gated yet — Auth.js + role
 * middleware land in Phase 4 (see PLAN.md's route list), at which point
 * this route is wrapped so only `role: 'admin'` users can load it. Until
 * then this is a local/dev-only surface for verifying the data core, not a
 * production admin console — do not deploy this phase's `/admin` publicly.
 */
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [trackCount] = await db.select({ count: sql<number>`count(*)` }).from(tracks);
  const [racerCount] = await db.select({ count: sql<number>`count(*)` }).from(racers);
  const [minorCount] = await db.select({ count: sql<number>`count(*)` }).from(racers).where(eq(racers.isMinor, true));
  const [resultCount] = await db.select({ count: sql<number>`count(*)` }).from(results);
  const [selfReportedCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(results)
    .where(eq(results.provenance, "self_reported"));

  const topRatings = await db
    .select({
      className: ratings.className,
      mu: ratings.mu,
      sigma: ratings.sigma,
      rankedResultCount: ratings.rankedResultCount,
      isProvisional: ratings.isProvisional,
      firstName: racers.firstName,
      lastName: racers.lastName,
    })
    .from(ratings)
    .innerJoin(racers, eq(ratings.racerId, racers.id))
    .orderBy(desc(ratings.mu))
    .limit(15);

  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <p className="label-small mb-2">Phase 1 — data core (unauthenticated dev view)</p>
      <h1 className="font-display text-4xl mb-8">Admin: data verification</h1>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-12">
        <Stat label="Tracks" value={trackCount.count} />
        <Stat label="Racers" value={racerCount.count} />
        <Stat label="Minors" value={minorCount.count} />
        <Stat label="Results" value={resultCount.count} />
        <Stat label="Self-reported" value={selfReportedCount.count} />
      </div>

      <h2 className="label-small mb-4">
        Top ratings across all classes (includes provisional — flagged; a public leaderboard would filter these out)
      </h2>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-mist">
            <th className="py-2">Racer</th>
            <th>Class</th>
            <th>Rating</th>
            <th>Ranked results</th>
            <th>Provisional?</th>
          </tr>
        </thead>
        <tbody>
          {topRatings.map((r, i) => (
            <tr key={i} className="border-b border-mist">
              <td className="py-2">
                {r.firstName} {r.lastName}
              </td>
              <td>{r.className}</td>
              <td className="tabular">{confidenceBandLabel({ mu: r.mu, sigma: r.sigma, rankedResultCount: r.rankedResultCount })}</td>
              <td className="tabular">{r.rankedResultCount}</td>
              <td>{r.isProvisional ? "yes — hidden from public leaderboard" : "no"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-mist p-4">
      <p className="tabular font-display text-3xl">{value}</p>
      <p className="text-xs text-graphite">{label}</p>
    </div>
  );
}
