import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe/client";
import { db } from "@/db/client";
import { connectAccounts, racers, subscriptions, tracks, zoneListings } from "@/db/schema";
import { splitSponsorshipAmount } from "@/lib/pricing/takeRate";
import { recordSponsorshipSale } from "@/lib/sponsorships/escrow";
import { getPayoutAccountOwnerForRacer } from "@/lib/stripe/connect";

/**
 * Verifies the Stripe signature before touching anything — never trust an
 * unverified webhook body. Requires STRIPE_WEBHOOK_SECRET; see README for
 * `stripe listen` forwarding during local development.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${err instanceof Error ? err.message : err}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;

      if (checkoutSession.mode === "subscription" && checkoutSession.metadata?.userId) {
        await db
          .insert(subscriptions)
          .values({
            userId: checkoutSession.metadata.userId,
            tier: "pro",
            stripeCustomerId: String(checkoutSession.customer),
            stripeSubscriptionId: String(checkoutSession.subscription),
            status: "active",
          })
          .onConflictDoUpdate({
            target: subscriptions.userId,
            set: { tier: "pro", stripeCustomerId: String(checkoutSession.customer), stripeSubscriptionId: String(checkoutSession.subscription), status: "active" },
          });
        break;
      }

      const { listingId, racerId, sponsorUserId } = checkoutSession.metadata ?? {};
      if (!listingId || !racerId || !sponsorUserId) break;

      const [racer] = await db.select().from(racers).where(eq(racers.id, racerId));
      if (!racer) break;

      const owner = await getPayoutAccountOwnerForRacer(racer);
      const [subscription] = owner ? await db.select().from(subscriptions).where(eq(subscriptions.userId, owner.ownerId)) : [];
      const tier = subscription?.tier ?? "free";

      let trackEnrolled = false;
      if (racer.homeTrackId) {
        const [track] = await db.select().from(tracks).where(eq(tracks.id, racer.homeTrackId));
        trackEnrolled = Boolean(track?.claimedByUserId);
      }

      const amountUsd = (checkoutSession.amount_total ?? 0) / 100;
      const split = splitSponsorshipAmount({ amountUsd, subscriptionTier: tier, trackEnrolledInRevShare: trackEnrolled });

      await recordSponsorshipSale({
        listingId,
        racerId,
        sponsorUserId,
        amountUsd: split.amountUsd,
        platformFeeUsd: split.platformFeeUsd,
        trackRevShareUsd: split.trackRevShareUsd,
        racerNetUsd: split.racerNetUsd,
        stripeChargeId: String(checkoutSession.payment_intent),
        term: "season",
      });

      await db.update(zoneListings).set({ isActive: false }).where(eq(zoneListings.id, listingId));
      break;
    }

    case "customer.subscription.deleted":
    case "customer.subscription.updated": {
      // Section 7: "On lapse the storefront stays live at the free rate;
      // results and profile never go away." Only the take-rate tier
      // changes — nothing here touches racers, results, or the profile.
      const stripeSubscription = event.data.object as Stripe.Subscription;
      const isActive = stripeSubscription.status === "active" || stripeSubscription.status === "trialing";
      await db
        .update(subscriptions)
        .set({ tier: isActive ? "pro" : "free", status: stripeSubscription.status })
        .where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id));
      break;
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const onboardingComplete = Boolean(account.details_submitted && account.charges_enabled);
      await db.update(connectAccounts).set({ onboardingComplete }).where(eq(connectAccounts.stripeAccountId, account.id));
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
