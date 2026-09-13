import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import {
  claimInvitations, claims, guardianRacers, laps, messages, messageThreads,
  racers, results, sponsorships, zoneListings, zones,
} from "@/db/schema";
import { logAuditEvent } from "@/lib/admin/audit";

/**
 * Section 3: "we will never delete your record — only you can... the
 * build must honour a deletion request in full: profile, results,
 * images, messages, with sponsorship transaction records retained only
 * as long as tax and payment obligations require." Financial records
 * can't be hard-deleted immediately without breaking retained tax
 * obligations, so a racer with sponsorship history becomes a scrubbed
 * tombstone (no name, no photo, no story, no results, no messages) rather
 * than a removed row — everything that ISN'T a financial record is
 * actually deleted, not just hidden.
 */
async function purgeRacerData(racerId: string) {
  const racerResults = await db.select({ id: results.id }).from(results).where(eq(results.racerId, racerId));
  for (const r of racerResults) {
    await db.delete(laps).where(eq(laps.resultId, r.id));
  }
  await db.delete(results).where(eq(results.racerId, racerId));

  const threads = await db.select({ id: messageThreads.id }).from(messageThreads).where(eq(messageThreads.racerId, racerId));
  for (const t of threads) {
    await db.delete(messages).where(eq(messages.threadId, t.id));
  }
  await db.delete(messageThreads).where(eq(messageThreads.racerId, racerId));

  await db.delete(claims).where(eq(claims.racerId, racerId));
  await db.delete(claimInvitations).where(eq(claimInvitations.racerId, racerId));
  await db.delete(guardianRacers).where(eq(guardianRacers.racerId, racerId));

  // Zones/listings can only go if no retained sponsorship references them.
  const racerZones = await db.select({ id: zones.id }).from(zones).where(eq(zones.racerId, racerId));
  for (const zone of racerZones) {
    const listingsForZone = await db.select({ id: zoneListings.id }).from(zoneListings).where(eq(zoneListings.zoneId, zone.id));
    for (const listing of listingsForZone) {
      const [referencedBySponsorship] = await db.select().from(sponsorships).where(eq(sponsorships.listingId, listing.id));
      if (!referencedBySponsorship) await db.delete(zoneListings).where(eq(zoneListings.id, listing.id));
    }
    const remainingListings = await db.select().from(zoneListings).where(eq(zoneListings.zoneId, zone.id));
    if (remainingListings.length === 0) await db.delete(zones).where(eq(zones.id, zone.id));
  }

  // Scrub every remaining piece of identifying content on the row itself
  // — this is the "profile" and "images" part of the deletion promise.
  await db
    .update(racers)
    .set({
      slug: `deleted-${nanoid(10)}`,
      firstName: "Deleted",
      lastName: "Racer",
      dob: null,
      numberDefault: null,
      classDefault: null,
      homeTrackId: null,
      bio: null,
      story: null,
      seasonGoal: null,
      socialFollowingSelfReported: null,
      trackdayAttendanceSelfReported: null,
      town: null,
      photoUrl: null,
      deletedAt: new Date(),
    })
    .where(eq(racers.id, racerId));
}

/**
 * Section 3's hard split: a guardian deleting a minor's account gets the
 * immediate branch; every other deletion (an adult deleting their own
 * account) gets the 90-day hold + restore path.
 */
export async function requestDeletion(params: { racerId: string; requestedByUserId: string; isGuardianOfMinor: boolean }) {
  if (params.isGuardianOfMinor) {
    await purgeRacerData(params.racerId);
    await logAuditEvent(params.requestedByUserId, "minor_deletion_immediate", {}, "racer", params.racerId);
    return { immediate: true };
  }

  await db.update(racers).set({ deletionRequestedAt: new Date() }).where(eq(racers.id, params.racerId));
  await logAuditEvent(params.requestedByUserId, "deletion_requested_90_day_hold", {}, "racer", params.racerId);
  return { immediate: false };
}

/** The restore path during the 90-day hold window. */
export async function restoreAccount(racerId: string) {
  const [racer] = await db.select().from(racers).where(eq(racers.id, racerId));
  if (!racer) throw new Error("Racer not found");
  if (racer.deletedAt) throw new Error("This account has already been purged and can no longer be restored");
  await db.update(racers).set({ deletionRequestedAt: null }).where(eq(racers.id, racerId));
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/** Cron-callable: purges every account whose 90-day hold has elapsed
 * without being restored. */
export async function runDeletionPurgeSweep(now: Date = new Date()) {
  const pending = await db.select().from(racers);
  const due = pending.filter((r) => r.deletionRequestedAt && !r.deletedAt && now.getTime() - r.deletionRequestedAt.getTime() >= NINETY_DAYS_MS);

  for (const racer of due) {
    await purgeRacerData(racer.id);
  }
  return { purgedCount: due.length };
}

/** A suspended (pending-deletion) or purged racer is never shown publicly. */
export function isAccessible(racer: { deletionRequestedAt: Date | null; deletedAt: Date | null }): boolean {
  return !racer.deletionRequestedAt && !racer.deletedAt;
}
