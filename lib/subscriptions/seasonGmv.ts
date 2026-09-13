import { inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { sponsorships } from "@/db/schema";

/** Actual sponsorship volume this year for a set of racers a user manages
 * — the input to the live Pro-upgrade savings arithmetic (section 7). */
export async function getSeasonGmvUsd(racerIds: string[]): Promise<number> {
  if (racerIds.length === 0) return 0;
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${sponsorships.amountUsd}), 0)` })
    .from(sponsorships)
    .where(inArray(sponsorships.racerId, racerIds));
  return Number(row?.total ?? 0);
}
