import Link from "next/link";
import { searchRacers, searchTracks } from "@/lib/search";
import { EmptyState } from "@/components/ui/EmptyState";
import { CONFIG } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Search | ${CONFIG.platformName}`,
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const [racerHits, trackHits] = query ? await Promise.all([searchRacers(query), searchTracks(query)]) : [[], []];

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl mb-6">Search</h1>
      <form className="mb-10">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Name, race number, track, class, or town"
          className="w-full border border-mist rounded-full px-5 py-3"
        />
      </form>

      {query && racerHits.length === 0 && trackHits.length === 0 && (
        <EmptyState title="Nothing matched that search" body="Try a name, a race number, a track, or a town." />
      )}

      {racerHits.length > 0 && (
        <div className="mb-8">
          <p className="label-small mb-3">Racers</p>
          <ul className="space-y-2">
            {racerHits.map((hit) => (
              <li key={hit.racer.id}>
                <Link href={`/racers/${hit.racer.slug}`} className="accent-underline font-medium">
                  {hit.racer.displayName}
                </Link>
                {hit.racer.classDefault && <span className="text-graphite text-sm"> — {hit.racer.classDefault}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {trackHits.length > 0 && (
        <div>
          <p className="label-small mb-3">Tracks</p>
          <ul className="space-y-2">
            {trackHits.map((track) => (
              <li key={track.id}>
                <Link href={`/tracks/${track.slug}`} className="accent-underline font-medium">
                  {track.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
