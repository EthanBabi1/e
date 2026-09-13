import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { bids, racers, subscriptions, tracks, zoneListings, zones } from "@/db/schema";
import { getStripeClient } from "@/lib/stripe/client";
import { splitSponsorshipAmount } from "@/lib/pricing/takeRate";
import { recordSponsorshipSale } from "./escrow";
import { getPayoutAccountOwnerForRacer } from "@/lib/stripe/connect";
import { sendEmail } from "@/lib/email/send";
import { getRecipientEmail } from "@/lib/notifications/dispatch";
import { GenericNotificationEmail } from "@/lib/email/templates/GenericNotificationEmail";

const DECLINE_RETRY_HOURS = 48;

type ChargeFn = (params: { setupIntentId: string; amountUsd: number }) => Promise<{ success: boolean; chargeId?: string }>;

async function defaultOffSessionCharge({ setupIntentId, amountUsd }: Parameters<ChargeFn>[0]): Promise<{ success: boolean; chargeId?: string }> {
  const stripe = getStripeClient();
  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  const paymentMethod = setupIntent.payment_method as string;
  const customer = setupIntent.customer as string;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountUsd * 100),
      currency: "usd",
      customer,
      payment_method: paymentMethod,
      off_session: true,
      confirm: true,
    });
    return { success: true, chargeId: paymentIntent.id };
  } catch {
    return { success: false };
  }
}

/**
 * Section EXISTING CODE's auction-close flow, ported: "bidder charged
 * only on winning, off-session charge at close, emailed payment link on
 * decline with 48 hours before rolling to the next bidder." Cron-callable
 * (Phase 6 wires the actual schedule); each run only advances listings
 * whose close time has passed, and — for a listing already in its 48-hour
 * decline-retry window — only rolls to the next bidder once that window
 * has elapsed too (encoded by re-extending `closesAt` on decline).
 */
export async function closeExpiredAuctions(chargeFn: ChargeFn = defaultOffSessionCharge) {
  const now = new Date();
  const expired = await db
    .select()
    .from(zoneListings)
    .where(and(eq(zoneListings.listingType, "auction"), eq(zoneListings.isActive, true), lte(zoneListings.closesAt, now)));

  let sold = 0;
  let closedWithNoBids = 0;

  for (const listing of expired) {
    const candidateBids = await db
      .select()
      .from(bids)
      .where(and(eq(bids.listingId, listing.id), eq(bids.isDeclined, false)))
      .orderBy(desc(bids.amountUsd));

    if (candidateBids.length === 0) {
      await db.update(zoneListings).set({ isActive: false }).where(eq(zoneListings.id, listing.id));
      closedWithNoBids++;
      continue;
    }

    const topBid = candidateBids[0];
    if (!topBid.stripeSetupIntentId) {
      // No card on file for this bid — treat like a decline.
      await declineBidAndNotify(listing.id, topBid.id, topBid.sponsorUserId, topBid.amountUsd);
      continue;
    }

    const chargeResult = await chargeFn({ setupIntentId: topBid.stripeSetupIntentId, amountUsd: topBid.amountUsd });

    if (!chargeResult.success) {
      await declineBidAndNotify(listing.id, topBid.id, topBid.sponsorUserId, topBid.amountUsd);
      continue;
    }

    const [zone] = await db.select().from(zones).where(eq(zones.id, listing.zoneId));
    const [racer] = await db.select().from(racers).where(eq(racers.id, zone.racerId));

    const owner = await getPayoutAccountOwnerForRacer(racer);
    const [subscription] = owner ? await db.select().from(subscriptions).where(eq(subscriptions.userId, owner.ownerId)) : [];
    let trackEnrolled = false;
    if (racer.homeTrackId) {
      const [track] = await db.select().from(tracks).where(eq(tracks.id, racer.homeTrackId));
      trackEnrolled = Boolean(track?.claimedByUserId);
    }

    const split = splitSponsorshipAmount({
      amountUsd: topBid.amountUsd,
      subscriptionTier: subscription?.tier ?? "free",
      trackEnrolledInRevShare: trackEnrolled,
    });

    await recordSponsorshipSale({
      listingId: listing.id,
      racerId: racer.id,
      sponsorUserId: topBid.sponsorUserId,
      amountUsd: split.amountUsd,
      platformFeeUsd: split.platformFeeUsd,
      trackRevShareUsd: split.trackRevShareUsd,
      racerNetUsd: split.racerNetUsd,
      stripeChargeId: chargeResult.chargeId!,
      term: listing.term,
    });

    await db.update(zoneListings).set({ isActive: false }).where(eq(zoneListings.id, listing.id));
    sold++;
  }

  return { sold, closedWithNoBids, processed: expired.length };
}

async function declineBidAndNotify(listingId: string, bidId: string, sponsorUserId: string, amountUsd: number) {
  await db.update(bids).set({ isDeclined: true, declinedAt: new Date() }).where(eq(bids.id, bidId));
  // Give the same listing another DECLINE_RETRY_HOURS before the next
  // highest remaining bidder is tried.
  await db
    .update(zoneListings)
    .set({ closesAt: new Date(Date.now() + DECLINE_RETRY_HOURS * 60 * 60 * 1000) })
    .where(eq(zoneListings.id, listingId));

  const email = await getRecipientEmail(sponsorUserId);
  if (email) {
    await sendEmail({
      to: email,
      subject: "Your winning bid couldn't be charged",
      react: GenericNotificationEmail({
        title: "Your winning bid couldn't be charged",
        body: `Your $${amountUsd} winning bid couldn't be charged to your card on file. Update your payment method within 48 hours or the zone rolls to the next bidder.`,
      }),
    });
  }
}
