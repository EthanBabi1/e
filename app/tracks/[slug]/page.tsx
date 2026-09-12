import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTrackBySlug, getTrackRecords, getRoster, getLatestResults } from "@/lib/tracks/getTrackData";
import { EmptyState } from "@/components/ui/EmptyState";
import { JsonLd } from "@/components/seo/JsonLd";
import { CONFIG } from "@/lib/config";

export const dynamic = "force-dynamic";

function formatLap(ms: number): string {
  return (ms / 1000).toFixed(3) + "s";
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const track = await getTrackBySlug(slug);
  if (!track) return {};
  return {
    title: `${track.name} — track records, results & roster | ${CONFIG.platformName}`,
    description: `${track.name}${track.city ? ` in ${track.city}${track.region ? `, ${track.region}` : ""}` : ""} — verified results, track records, and the racers building their record here.`,
  };
}

export default async function TrackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const track = await getTrackBySlug(slug);
  if (!track) notFound();

  const [records, roster, latestResults] = await Promise.all([
    getTrackRecords(track.id),
    getRoster(track.id),
    getLatestResults(track.id),
  ]);

  const claimedCount = roster.filter((r) => r.claimStatus === "claimed").length;

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SportsOrganization",
          name: track.name,
          address: track.city ? { "@type": "PostalAddress", addressLocality: track.city, addressRegion: track.region ?? undefined } : undefined,
        }}
      />
      <section className="marble-surface px-6 py-16">
        <div className="max-w-5xl mx-auto">
          {track.isFictionalDemo && (
            <p className="label-small mb-3 bg-paper/80 inline-block rounded-full px-3 py-1">Fictional demo track</p>
          )}
          <h1 className="font-display text-5xl mb-2">{track.name}</h1>
          <p className="text-graphite">{[track.city, track.region].filter(Boolean).join(", ")}</p>
          {roster.length > 0 && (
            <p className="mt-4 text-sm text-graphite">
              Racing here this season: <span className="tabular text-ink font-medium">{roster.length}</span> drivers
              {claimedCount > 0 && <> · <span className="tabular text-ink font-medium">{claimedCount}</span> with a claimed profile</>}
            </p>
          )}
        </div>
      </section>

      {records.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-12">
          <p className="label-small mb-4">Track records</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {records.map((r) => (
              <div key={r.className} className="rounded-xl border border-mist p-4">
                <p className="text-xs text-graphite mb-1">{r.className}</p>
                <p className="font-mono-tabular text-xl">{formatLap(r.bestLapMs)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {latestResults.length > 0 ? (
        <section className="max-w-5xl mx-auto px-6 py-12">
          <p className="label-small mb-4">Latest results</p>
          <ul className="space-y-2">
            {latestResults.map((r) => (
              <li key={r.resultId} className="flex justify-between border-b border-mist py-2 text-sm">
                <span className="text-graphite">
                  {r.eventDate} · {r.className}
                </span>
                <span className="tabular">P{r.position ?? "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="max-w-5xl mx-auto px-6 py-12">
          <EmptyState
            eyebrow={track.name}
            title="Results haven't been published here yet"
            body="Once this track's results are verified, they'll show up here — and every racer's own page — automatically."
          />
        </div>
      )}

      {roster.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-12">
          <p className="label-small mb-4">Roster</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {roster.map((r) => (
              <Link key={r.id} href={`/racers/${r.slug}`} className="rounded-lg border border-mist p-3 text-sm hover:border-ink transition-colors">
                <p className="font-medium">{r.displayName}</p>
                <p className="text-xs text-graphite">{r.classDefault}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
