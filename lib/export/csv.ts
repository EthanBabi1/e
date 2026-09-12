import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { events, raceSessions, results, tracks } from "@/db/schema";

/**
 * Full-record CSV export (section 3 permanence promise: "we will never
 * delete your record — only you can. Export it any time, free tier
 * included."). Every published result, whatever its provenance —
 * self-reported rows are excluded from ranking, never from a racer's own
 * export of their own data.
 */
export async function generateResultsCsv(racerId: string): Promise<string> {
  const rows = await db
    .select({
      date: events.date,
      track: tracks.name,
      event: events.name,
      sessionType: raceSessions.type,
      className: raceSessions.className,
      position: results.position,
      laps: results.laps,
      bestLapMs: results.bestLapMs,
      totalTimeMs: results.totalTimeMs,
      status: results.status,
      provenance: results.provenance,
      points: results.points,
    })
    .from(results)
    .innerJoin(raceSessions, eq(results.sessionId, raceSessions.id))
    .innerJoin(events, eq(raceSessions.eventId, events.id))
    .innerJoin(tracks, eq(events.trackId, tracks.id))
    .where(and(eq(results.racerId, racerId)))
    .orderBy(asc(events.date));

  const header = [
    "Date", "Track", "Event", "Session", "Class", "Position", "Laps",
    "Best Lap (s)", "Total Time (s)", "Status", "Provenance", "Points",
  ];

  const csvRows = rows.map((r) => [
    r.date,
    csvEscape(r.track),
    csvEscape(r.event),
    r.sessionType,
    csvEscape(r.className),
    r.position ?? "",
    r.laps ?? "",
    r.bestLapMs != null ? (r.bestLapMs / 1000).toFixed(3) : "",
    r.totalTimeMs != null ? (r.totalTimeMs / 1000).toFixed(3) : "",
    r.status,
    r.provenance,
    r.points ?? "",
  ]);

  return [header, ...csvRows].map((row) => row.join(",")).join("\n");
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
