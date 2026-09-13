import Link from "next/link";
import { db } from "@/db/client";
import { tracks } from "@/db/schema";
import { EmptyState } from "@/components/ui/EmptyState";
import { CONFIG } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Tracks | ${CONFIG.platformName}`,
  description: "Every track with racers building a verified record here.",
};

export default async function TracksIndexPage() {
  const allTracks = await db.select().from(tracks).orderBy(tracks.name);

  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <p className="label-small mb-2">Tracks</p>
      <h1 className="font-display text-4xl mb-2">Every track on {CONFIG.platformName}</h1>
      <p className="text-graphite mb-10 max-w-xl">
        Championship standings, verified results, and an embeddable leaderboard — free for any
        track, claimed or not.
      </p>

      {allTracks.length === 0 ? (
        <EmptyState title="No tracks yet" body={`${CONFIG.launchTrack} will be the first.`} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {allTracks.map((track) => (
            <Link
              key={track.id}
              href={`/tracks/${track.slug}`}
              className="rounded-xl border border-mist p-5 hover:border-ink transition-colors block"
            >
              <p className="font-medium mb-1">{track.name}</p>
              <p className="text-xs text-graphite">{[track.city, track.region].filter(Boolean).join(", ") || "Location not listed"}</p>
              {!track.claimedByUserId && <p className="label-small mt-3">Unclaimed</p>}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
