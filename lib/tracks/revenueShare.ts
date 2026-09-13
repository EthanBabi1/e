import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { connectAccounts, payouts, racers, sponsorships, tracks } from "@/db/schema";
import { getStripeClient } from "@/lib/stripe/client";

type TransferFn = (params: { stripeAccountId: string; amountUsd: number }) => Promise<string>;

async function defaultTransfer({ stripeAccountId, amountUsd }: Parameters<TransferFn>[0]): Promise<string> {
  const stripe = getStripeClient();
  const transfer = await stripe.transfers.create({ amount: Math.round(amountUsd * 100), currency: "usd", destination: stripeAccountId });
  return transfer.id;
}

/**
 * Section 7: "Track revenue share transfers monthly." Computed as
 * lifetime-accrued-minus-lifetime-already-paid rather than maintaining a
 * per-sponsorship "has this been paid out" flag — simpler, and correct
 * as long as this job is the only thing that ever creates a
 * `kind: 'track_rev_share'` payout row.
 */
export async function runMonthlyTrackRevShare(transferFn: TransferFn = defaultTransfer) {
  const claimedTracks = await db.select().from(tracks).where(sql`${tracks.claimedByUserId} is not null`);

  let paidCount = 0;
  for (const track of claimedTracks) {
    const trackRacers = await db.select({ id: racers.id }).from(racers).where(eq(racers.homeTrackId, track.id));
    const racerIds = trackRacers.map((r) => r.id);
    if (racerIds.length === 0) continue;

    const [accrued] = await db
      .select({ total: sql<number>`coalesce(sum(${sponsorships.trackRevShareUsd}), 0)` })
      .from(sponsorships)
      .where(inArray(sponsorships.racerId, racerIds));

    const [connectAccount] = await db.select().from(connectAccounts).where(eq(connectAccounts.ownerId, track.claimedByUserId!));
    if (!connectAccount) continue;

    const [alreadyPaid] = await db
      .select({ total: sql<number>`coalesce(sum(${payouts.amountUsd}), 0)` })
      .from(payouts)
      .where(eq(payouts.connectAccountId, connectAccount.id));

    const owedUsd = Math.round((Number(accrued?.total ?? 0) - Number(alreadyPaid?.total ?? 0)) * 100) / 100;
    if (owedUsd <= 0) continue;

    const transferId = await transferFn({ stripeAccountId: connectAccount.stripeAccountId, amountUsd: owedUsd });
    await db.insert(payouts).values({ connectAccountId: connectAccount.id, amountUsd: owedUsd, kind: "track_rev_share", stripeTransferId: transferId });
    paidCount++;
  }

  return { paidCount };
}
