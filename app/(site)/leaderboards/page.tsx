import Link from "next/link";
import { db } from "@/db/client";
import { racers } from "@/db/schema";
import { getLeaderboard } from "@/lib/ratings/leaderboard";
import { EmptyState } from "@/components/ui/EmptyState";
import { confidenceBandLabel } from "@/lib/ratings/engine";
import { sql } from "drizzle-orm";
import { CONFIG } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Leaderboards | ${CONFIG.platformName}`,
  description: "Driver ratings by class. Only racers past the provisional threshold appear here.",
};

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>;
}) {
  const { class: classFilter } = await searchParams;

  const classRows = await db
    .select({ className: racers.classDefault })
    .from(racers)
    .where(sql`${racers.classDefault} is not null`)
    .groupBy(racers.classDefault);
  const classes = classRows.map((r) => r.className!).filter(Boolean).sort();
  const activeClass = classFilter ?? classes[0];

  const entries = activeClass ? await getLeaderboard({ className: activeClass, limit: 25 }) : [];

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <p className="label-small mb-2">Driver ratings</p>
      <h1 className="font-display text-4xl mb-2">Leaderboards</h1>
      <p className="text-graphite mb-8 max-w-xl">
        Elo-style, weighted by field strength, hidden until a driver has enough ranked results to mean something.{" "}
        <Link href="/rating" className="accent-underline">
          How this is calculated
        </Link>
        .
      </p>

      <div className="flex gap-2 flex-wrap mb-8">
        {classes.map((c) => (
          <Link
            key={c}
            href={`/leaderboards?class=${encodeURIComponent(c)}`}
            className={`px-3 py-1.5 rounded-full text-sm ${c === activeClass ? "bg-ink text-paper" : "bg-marble text-graphite"}`}
          >
            {c}
          </Link>
        ))}
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="No settled ratings yet in this class"
          body="Ratings stay private and provisional until a driver clears the minimum number of ranked results. That's by design, not a bug. Check back as the season plays out."
        />
      ) : (
        <ol className="space-y-2">
          {entries.map((entry, i) => (
            <li key={entry.racer.id} className="flex items-center justify-between border-b border-mist py-3">
              <div className="flex items-center gap-4">
                <span className="tabular text-graphite w-6">{i + 1}</span>
                <Link href={`/racers/${entry.racer.slug}`} className="font-medium accent-underline">
                  {entry.racer.displayName}
                </Link>
              </div>
              <span className="font-mono-tabular text-sm">{confidenceBandLabel({ mu: entry.mu, sigma: entry.sigma, rankedResultCount: entry.rankedResultCount })}</span>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
