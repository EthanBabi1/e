import Link from "next/link";
import { ProvenanceBadge } from "@/components/ui/ProvenanceBadge";
import type { SeasonResultRow } from "@/lib/telemetry";

function formatLap(ms: number | null): string {
  if (ms == null) return "—";
  return (ms / 1000).toFixed(3) + "s";
}

export function RecordTable({ results }: { results: SeasonResultRow[] }) {
  const raceResults = results.filter((r) => r.sessionType === "race");
  if (raceResults.length === 0) return null; // never render an empty table (section 1)

  return (
    <section className="max-w-5xl mx-auto px-6 py-12">
      <p className="label-small mb-4">Record</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b border-mist label-small">
              <th className="py-2 pr-4">Date</th>
              <th className="pr-4">Track</th>
              <th className="pr-4">Class</th>
              <th className="pr-4">Finish</th>
              <th className="pr-4">Best lap</th>
              <th>Verification</th>
            </tr>
          </thead>
          <tbody>
            {raceResults.map((r) => (
              <tr key={r.resultId} className="border-b border-mist">
                <td className="py-2 pr-4 tabular text-graphite">{r.date}</td>
                <td className="pr-4">
                  <Link href={`/races/${r.sessionId}`} className="accent-underline">
                    {r.trackName}
                  </Link>
                </td>
                <td className="pr-4 text-graphite">{r.className}</td>
                <td className="pr-4 tabular">
                  {r.status === "finished" ? `P${r.position}` : r.status.toUpperCase()}
                </td>
                <td className="pr-4 tabular font-mono-tabular">{formatLap(r.bestLapMs)}</td>
                <td>
                  <ProvenanceBadge provenance={r.provenance} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Last five finishes as position chips (section 4). */
export function FormGuideStrip({ results }: { results: SeasonResultRow[] }) {
  const lastFive = results
    .filter((r) => r.sessionType === "race" && r.status === "finished" && r.position != null)
    .slice(0, 5);
  if (lastFive.length === 0) return null;

  return (
    <div className="flex gap-2">
      {lastFive.map((r) => (
        <span
          key={r.resultId}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium tabular ${
            r.position! <= 3 ? "bg-accent text-paper" : "bg-marble text-graphite"
          }`}
          title={`${r.trackName} — P${r.position}`}
        >
          P{r.position}
        </span>
      ))}
    </div>
  );
}
