import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { guardianRacers, guardians, racers } from "@/db/schema";

/**
 * A signed-in user's own racer profile — or, for a guardian, the minor(s)
 * they manage (section 2: the guardian is the account holder, so "your
 * dashboard" for a guardian means their linked racer's dashboard).
 */
export async function getManagedRacers(userId: string) {
  const ownRacer = await db.select().from(racers).where(eq(racers.userId, userId));

  const [guardianRow] = await db.select().from(guardians).where(eq(guardians.userId, userId));
  let guardianedRacers: (typeof racers.$inferSelect)[] = [];
  if (guardianRow) {
    const links = await db.select().from(guardianRacers).where(eq(guardianRacers.guardianId, guardianRow.id));
    if (links.length) {
      const rows = await Promise.all(links.map((l) => db.select().from(racers).where(eq(racers.id, l.racerId))));
      guardianedRacers = rows.flat();
    }
  }

  return [...ownRacer, ...guardianedRacers];
}
