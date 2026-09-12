import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getRaceBySessionId } from "@/lib/races/getRaceData";
import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import { JsonLd } from "@/components/seo/JsonLd";
import { CONFIG } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await getRaceBySessionId(id);
  if (!data || !data.event || !data.track) return {};
  return {
    title: `${data.track.name} — ${data.event.name} ${data.session.className} ${data.session.type} | ${CONFIG.platformName}`,
    description: `Full results for the ${data.session.className} ${data.session.type} at ${data.event.name}, ${data.track.name}, ${data.event.date}.`,
  };
}

function formatLap(ms: number | null): string {
  if (ms == null) return "—";
  return (ms / 1000).toFixed(3) + "s";
}

export default async function RacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getRaceBySessionId(id);
  if (!data || !data.event || !data.track) notFound();

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: `${data.event.name} — ${data.session.className} ${data.session.type}`,
          startDate: data.event.date,
          location: { "@type": "Place", name: data.track.name },
        }}
      />
      <p className="label-small mb-2">
        {data.track.name} · {data.event.date}
      </p>
      <h1 className="font-display text-4xl mb-8">
        {data.session.className} — {data.session.type === "race" ? "Race" : data.session.type === "qualifying" ? "Qualifying" : "Practice"}
        {data.session.name ? ` (${data.session.name})` : ""}
      </h1>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-mist label-small">
            <th className="py-2 pr-4">Pos</th>
            <th className="pr-4">Racer</th>
            <th className="pr-4">Best lap</th>
            <th>Verification</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.result.id} className="border-b border-mist">
              <td className="py-2 pr-4 tabular">{row.result.status === "finished" ? `P${row.result.position}` : row.result.status.toUpperCase()}</td>
              <td className="pr-4">
                {row.racer ? (
                  <Link href={`/racers/${row.racer.slug}`} className="accent-underline">
                    {row.racer.displayName}
                  </Link>
                ) : (
                  <span className="text-graphite">{row.result.driverNameRaw ?? "Unknown"}</span>
                )}
              </td>
              <td className="pr-4 font-mono-tabular tabular">{formatLap(row.result.bestLapMs)}</td>
              <td>
                <ProvenanceBadge provenance={row.result.provenance} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
