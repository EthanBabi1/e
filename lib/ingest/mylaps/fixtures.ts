import { TransientSyncError, PermanentSyncError } from "./errors";

export interface MylapsFixtureLap {
  lapNumber: number;
  lapTimeMs: number;
}

export interface MylapsFixtureSession {
  trackName: string;
  eventName: string;
  eventDate: string; // ISO date
  sessionType: "practice" | "qualifying" | "race";
  className: string;
  position: number | null;
  laps: MylapsFixtureLap[];
  status: "finished" | "dnf" | "dns";
  upstreamEventId: string;
  upstreamSessionId: string;
  upstreamResultId: string;
}

/**
 * Canned data standing in for a real api2.mylaps.com response, shaped per
 * the community client's documented model (events/sessions/results/laps —
 * see DATA-ACCESS.md). Used because Path A is flagged off (no confirmed
 * access) — swap this module for a real HTTP client once that changes,
 * the rest of lib/ingest/mylaps/ doesn't need to know the difference.
 *
 * A few reserved transponder numbers simulate failure modes for the sync
 * status / retry logic to exercise without a live upstream:
 *   "FAIL-TRANSIENT" -> always throws TransientSyncError
 *   "FAIL-PERMANENT" -> always throws PermanentSyncError
 *   "EMPTY"          -> succeeds with zero sessions (a real "no results yet",
 *                        NOT to be confused with a failed sync returning
 *                        nothing — section 3 draws this distinction sharply)
 */
export async function fetchFixtureResultsForTransponder(transponderNumber: string): Promise<MylapsFixtureSession[]> {
  if (transponderNumber === "FAIL-TRANSIENT") {
    throw new TransientSyncError("Simulated timeout contacting MYLAPS (fixture)");
  }
  if (transponderNumber === "FAIL-PERMANENT") {
    throw new PermanentSyncError("Simulated 401 — transponder no longer authorized (fixture)");
  }
  if (transponderNumber === "EMPTY") {
    return [];
  }

  return [
    {
      trackName: "MYLAPS Fixture Track (demo)",
      eventName: "MYLAPS Fixture Round 6",
      eventDate: "2026-08-02",
      sessionType: "practice",
      className: "Junior Sportsman",
      position: null,
      laps: [40200, 39850, 39620, 39510, 40010].map((lapTimeMs, i) => ({ lapNumber: i + 1, lapTimeMs })),
      status: "finished",
      upstreamEventId: "fixture-evt-6",
      upstreamSessionId: "fixture-sess-6-practice",
      upstreamResultId: `fixture-res-6-practice-${transponderNumber}`,
    },
    {
      trackName: "MYLAPS Fixture Track (demo)",
      eventName: "MYLAPS Fixture Round 6",
      eventDate: "2026-08-02",
      sessionType: "race",
      className: "Junior Sportsman",
      position: 3,
      laps: [39900, 39400, 39200, 39350, 39600, 39800, 39750, 39300, 39150, 39500, 39700, 39250].map(
        (lapTimeMs, i) => ({ lapNumber: i + 1, lapTimeMs })
      ),
      status: "finished",
      upstreamEventId: "fixture-evt-6",
      upstreamSessionId: "fixture-sess-6-race",
      upstreamResultId: `fixture-res-6-race-${transponderNumber}`,
    },
  ];
}
