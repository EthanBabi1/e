import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { trackStaff, tracks } from "@/db/schema";
import { logEvent, ANALYTICS_EVENTS } from "@/lib/analytics/events";

/**
 * Section 5: a track claiming its page. No verification service exists to
 * confirm the claimant actually represents the track (same honest gap as
 * guardian identity in lib/accounts/claim.ts) — flagged in REVIEW.md.
 */
export async function claimTrack(trackId: string, userId: string) {
  const [track] = await db.select().from(tracks).where(eq(tracks.id, trackId));
  if (!track) throw new Error("Track not found");
  if (track.claimedByUserId) throw new Error("This track has already been claimed");

  await db.update(tracks).set({ claimedByUserId: userId }).where(eq(tracks.id, trackId));
  await db.insert(trackStaff).values({ trackId, userId, role: "owner" });
  await logEvent(ANALYTICS_EVENTS.TRACK_SIGNED_UP, { trackId, userId });

  return { trackId };
}

export async function isTrackStaff(trackId: string, userId: string): Promise<boolean> {
  const rows = await db.select().from(trackStaff).where(eq(trackStaff.trackId, trackId));
  return rows.some((r) => r.userId === userId);
}
