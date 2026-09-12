import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { mylapsSyncStatus } from "@/db/schema";
import { FEATURE_FLAGS } from "@/lib/config";
import { fetchFixtureResultsForTransponder, type MylapsFixtureSession } from "./fixtures";
import { withRetry } from "./retry";

export class MylapsImportDisabledError extends Error {}

export interface ConfirmationGroup {
  trackName: string;
  eventName: string;
  eventDate: string;
  sessions: MylapsFixtureSession[];
}

function groupForConfirmation(sessions: MylapsFixtureSession[]): ConfirmationGroup[] {
  const byEvent = new Map<string, ConfirmationGroup>();
  for (const session of sessions) {
    const key = `${session.trackName}::${session.eventName}`;
    const group = byEvent.get(key) ?? {
      trackName: session.trackName,
      eventName: session.eventName,
      eventDate: session.eventDate,
      sessions: [],
    };
    group.sessions.push(session);
    byEvent.set(key, group);
  }
  return [...byEvent.values()];
}

/**
 * Pulls a racer's MYLAPS results for confirmation (section 3's "we found 34
 * sessions across 3 tracks — confirm these are you"). Path A is gated
 * behind FEATURE_MYLAPS_IMPORT — see DATA-ACCESS.md for why — so this
 * throws immediately rather than silently no-op'ing if called while off.
 * Always updates mylaps_sync_status, success or failure, so the racer
 * dashboard can show honest sync health (section 3).
 */
export async function pullMylapsResultsForConfirmation(racerId: string, transponderNumber: string) {
  if (!FEATURE_FLAGS.mylapsImport) {
    throw new MylapsImportDisabledError(
      "MYLAPS import is currently disabled on this platform (see DATA-ACCESS.md) — use photo, CSV, or manual entry instead."
    );
  }

  const [existingStatus] = await db.select().from(mylapsSyncStatus).where(eq(mylapsSyncStatus.racerId, racerId));
  const now = new Date();

  try {
    const sessions = await withRetry(() => fetchFixtureResultsForTransponder(transponderNumber));

    if (existingStatus) {
      await db
        .update(mylapsSyncStatus)
        .set({ lastSuccessAt: now, lastAttemptAt: now, consecutiveFailures: 0, lastErrorMessage: null, transponderNumber })
        .where(eq(mylapsSyncStatus.racerId, racerId));
    } else {
      await db.insert(mylapsSyncStatus).values({
        racerId,
        transponderNumber,
        lastSuccessAt: now,
        lastAttemptAt: now,
        consecutiveFailures: 0,
      });
    }

    return { groups: groupForConfirmation(sessions), totalSessions: sessions.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const consecutiveFailures = (existingStatus?.consecutiveFailures ?? 0) + 1;

    if (existingStatus) {
      await db
        .update(mylapsSyncStatus)
        .set({ lastAttemptAt: now, consecutiveFailures, lastErrorMessage: message })
        .where(eq(mylapsSyncStatus.racerId, racerId));
    } else {
      await db.insert(mylapsSyncStatus).values({
        racerId,
        transponderNumber,
        lastAttemptAt: now,
        consecutiveFailures,
        lastErrorMessage: message,
      });
    }

    throw err;
  }
}

const STALE_SYNC_DAYS = 7;

/**
 * Section 3: "When a sync has failed for more than 7 days, email the racer
 * with the manual upload path." Pure decision function — actual email
 * sending is wired to Resend in Phase 4's notification system; this is the
 * logic that decides whether to, testable without it.
 */
export function shouldNotifyStaleSync(status: {
  lastSuccessAt: Date | null;
  staleNoticeEmailSentAt: Date | null;
}, now: Date = new Date()): boolean {
  if (status.staleNoticeEmailSentAt) return false; // already notified, don't spam
  const staleSince = status.lastSuccessAt ?? new Date(0); // never succeeded = stale from day one
  const daysSince = (now.getTime() - staleSince.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > STALE_SYNC_DAYS;
}

/**
 * Section 3: "Admin alert on a platform-wide failure — if the upstream is
 * down for everyone, I need to know within the hour." A simple ratio
 * check: if most racers who attempted a sync in the last hour all failed,
 * it's the upstream, not each racer's individual transponder.
 */
export function isPlatformWideFailure(recentAttempts: { succeeded: boolean }[]): boolean {
  if (recentAttempts.length < 5) return false; // not enough signal to call it platform-wide
  const failureRate = recentAttempts.filter((a) => !a.succeeded).length / recentAttempts.length;
  return failureRate > 0.8;
}
