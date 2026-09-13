import { notFound } from "next/navigation";
import Link from "next/link";
import { getTrackBySlug, getTrackRecords, getLatestResults } from "@/lib/tracks/getTrackData";
import { CONFIG } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Section 5: "Embeddable leaderboard widget: a script tag/iframe for a
 * track's existing site." No SiteHeader/nav here (see app/layout.tsx's
 * comment) — this renders inside someone else's page, not ours. Kept to
 * the palette/type tokens but otherwise as small and unbranded as
 * possible; the one link at the bottom is the "quietly becomes a funnel
 * back here" part the brief calls out.
 */
export default async function TrackEmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const track = await getTrackBySlug(slug);
  if (!track) notFound();

  const [records, latest] = await Promise.all([getTrackRecords(track.id), getLatestResults(track.id, 5)]);

  return (
    <div className="p-4 text-sm bg-paper text-ink" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <p className="font-display text-lg mb-3">{track.name}</p>
      {records.length > 0 && (
        <div className="mb-3">
          {records.slice(0, 3).map((r) => (
            <div key={r.className} className="flex justify-between text-xs py-1 border-b border-mist">
              <span className="text-graphite">{r.className} record</span>
              <span className="font-mono-tabular">{(r.bestLapMs / 1000).toFixed(3)}s</span>
            </div>
          ))}
        </div>
      )}
      {latest.length > 0 ? (
        <ul>
          {latest.map((r) => (
            <li key={r.resultId} className="flex justify-between text-xs py-1 border-b border-mist">
              <span className="text-graphite">{r.className}</span>
              <span className="tabular">{r.position != null ? `P${r.position}` : "N/A"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-graphite">Results will appear here once published.</p>
      )}
      <Link href={`https://${CONFIG.domain}/tracks/${track.slug}`} target="_blank" className="block text-xs text-graphite mt-3 text-right">
        Full results on {CONFIG.platformName} →
      </Link>
    </div>
  );
}
