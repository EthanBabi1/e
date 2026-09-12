import { db } from "@/db/client";
import { analyticsEvents } from "@/db/schema";

/**
 * The funnel stages named in section 13. Not every stage has a real
 * trigger point yet — subscription/sponsorship events land with Phase 5,
 * claim events with Phase 4 — but the event names are fixed here up front
 * so the admin dashboard's query logic doesn't need to change shape later.
 */
export const ANALYTICS_EVENTS = {
  GHOST_PROFILE_CREATED: "ghost_profile_created",
  RESULTS_PUBLISHED: "results_published",
  RACER_CLAIMED: "racer_claimed", // Phase 4
  PROFILE_COMPLETED: "profile_completed", // Phase 4 (story + photo + results present)
  ZONE_LISTED: "zone_listed", // Phase 5
  SPONSORSHIP_SOLD: "sponsorship_sold", // Phase 5
  PRO_UPGRADE: "pro_upgrade", // Phase 5
  TRACK_SIGNED_UP: "track_signed_up", // Phase 6
} as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export async function logEvent(
  eventType: AnalyticsEventType,
  fields: { racerId?: string; trackId?: string; userId?: string; metadata?: Record<string, unknown> } = {}
) {
  await db.insert(analyticsEvents).values({
    eventType,
    racerId: fields.racerId,
    trackId: fields.trackId,
    userId: fields.userId,
    metadata: fields.metadata ?? {},
  });
}
