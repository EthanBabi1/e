import { eq, inArray, or } from "drizzle-orm";
import { db } from "@/db/client";
import { racers, sponsorships } from "@/db/schema";
import { getManagedRacers } from "@/lib/dashboard/getCurrentRacer";

/** Every sponsorship a user needs to act on or track — as the racer/
 * guardian receiving it, or as the sponsor who bought it. */
export async function getSponsorshipsForUser(userId: string) {
  const managed = await getManagedRacers(userId);
  const managedRacerIds = managed.map((r) => r.id);

  const condition = managedRacerIds.length
    ? or(eq(sponsorships.sponsorUserId, userId), inArray(sponsorships.racerId, managedRacerIds))
    : eq(sponsorships.sponsorUserId, userId);

  return db
    .select({ sponsorship: sponsorships, racer: racers })
    .from(sponsorships)
    .innerJoin(racers, eq(sponsorships.racerId, racers.id))
    .where(condition);
}
