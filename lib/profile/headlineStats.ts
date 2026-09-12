import type { SeasonResultRow } from "@/lib/telemetry";

export interface HeadlineStat {
  label: string;
  value: number;
  suffix?: string;
}

/**
 * Section 1: "A thin record is stated as fact, not as absence: '2 races
 * this season' reads fine. '0 wins' does not — omit it." This never pads
 * out to a fixed count of three stats — it returns whatever is true and
 * worth saying, which is sometimes just one thing.
 */
export function computeHeadlineStats(results: SeasonResultRow[]): HeadlineStat[] {
  const raceResults = results.filter((r) => r.sessionType === "race" && r.status !== "dns");
  const stats: HeadlineStat[] = [];

  if (raceResults.length > 0) {
    stats.push({ label: raceResults.length === 1 ? "race" : "races this season", value: raceResults.length });
  }

  const podiums = raceResults.filter((r) => r.position != null && r.position <= 3).length;
  if (podiums > 0) {
    stats.push({ label: podiums === 1 ? "podium" : "podiums", value: podiums });
  }

  const wins = raceResults.filter((r) => r.position === 1).length;
  if (wins > 0) {
    stats.push({ label: wins === 1 ? "win" : "wins", value: wins });
  }

  if (stats.length < 3) {
    const seasons = new Set(results.map((r) => r.date.slice(0, 4))).size;
    if (seasons > 0) {
      stats.push({ label: seasons === 1 ? "season racing" : "seasons racing", value: seasons });
    }
  }

  return stats.slice(0, 3);
}
