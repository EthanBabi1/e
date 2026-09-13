import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTrackBySlugForPortal, getTrackRevenue, getTrackSeries } from "@/lib/tracks/getTrackPortalData";
import { getRoster } from "@/lib/tracks/getTrackData";
import { isTrackStaff } from "@/lib/tracks/claim";
import { ClaimTrackButton } from "./ClaimTrackButton";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function TrackPortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) redirect(`/sign-in`);

  const { slug } = await params;
  const track = await getTrackBySlugForPortal(slug);
  if (!track) notFound();

  if (!track.claimedByUserId) {
    return (
      <main className="max-w-md mx-auto px-6 py-24 text-center">
        <p className="font-display text-2xl mb-4">Claim {track.name}</p>
        <p className="text-graphite mb-6">
          Claiming gets you free championship automation, a roster of every racer already here, and a share of sponsorship revenue.
        </p>
        <ClaimTrackButton trackId={track.id} />
      </main>
    );
  }

  const staff = await isTrackStaff(track.id, session.user.id);
  if (!staff) {
    return (
      <main className="max-w-md mx-auto px-6 py-24 text-center">
        <p className="text-graphite">This track has already been claimed by someone else.</p>
      </main>
    );
  }

  const [roster, revenue, seriesList] = await Promise.all([getRoster(track.id), getTrackRevenue(track.id), getTrackSeries(track.id)]);
  const claimedCount = roster.filter((r) => r.claimStatus === "claimed").length;

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl mb-2">{track.name} — track portal</h1>
      <p className="text-graphite mb-10">Racing here this season: {roster.length} drivers, {claimedCount} with a claimed profile.</p>

      <section className="mb-10">
        <p className="label-small mb-3">Revenue share</p>
        <div className="rounded-xl border border-mist p-4 flex gap-8">
          <div>
            <p className="font-display text-2xl">${revenue.gmv.toFixed(0)}</p>
            <p className="text-xs text-graphite">sponsorship GMV from this track&apos;s racers</p>
          </div>
          <div>
            <p className="font-display text-2xl">${revenue.trackShare.toFixed(0)}</p>
            <p className="text-xs text-graphite">your share, paid monthly</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <p className="label-small mb-3">Championships</p>
        {seriesList.length === 0 ? (
          <EmptyState title="No championship set up yet" body="Define a series to get automatic standings from published results." />
        ) : (
          <ul className="space-y-2">
            {seriesList.map((s) => (
              <li key={s.id} className="rounded-lg border border-mist p-3 text-sm">
                {s.name} — {s.seasonYear} — {(s.classes as string[]).join(", ")}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <p className="label-small mb-3">Embed this track&apos;s leaderboard</p>
        <code className="block bg-marble rounded-lg p-3 text-xs overflow-x-auto">
          {`<iframe src="https://podiumrow.example/embed/tracks/${track.slug}" width="100%" height="480" frameborder="0"></iframe>`}
        </code>
      </section>

      <section>
        <p className="label-small mb-3">Roster</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {roster.map((r) => (
            <div key={r.id} className="rounded-lg border border-mist p-3 text-sm">
              <p className="font-medium">{r.displayName}</p>
              <p className="text-xs text-graphite">{r.claimStatus}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
