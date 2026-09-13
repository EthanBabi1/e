import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { connectAccounts, guardianRacers, guardians, racers, sponsorships } from "@/db/schema";
import { CONFIG } from "@/lib/config";
import { getStripeClient } from "@/lib/stripe/client";
import { getPayoutAccountOwnerForRacer } from "@/lib/stripe/connect";
import { sendFinancialNotificationForRacer } from "@/lib/notifications/dispatch";
import { logEvent, ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { createSponsorshipAgreement } from "./agreement";

/**
 * Section 7's flow, implemented as an explicit state machine on
 * `sponsorships.status` rather than inferred from which timestamp columns
 * happen to be set — each function below only accepts the one prior
 * status it's a valid transition from, and throws otherwise. This is what
 * makes "guardian approves the winner before funds move" a real
 * constraint rather than a UI convention someone could route around by
 * calling things in the wrong order.
 */

export async function recordSponsorshipSale(params: {
  listingId: string;
  racerId: string;
  sponsorUserId: string;
  amountUsd: number;
  platformFeeUsd: number;
  trackRevShareUsd: number;
  racerNetUsd: number;
  stripeChargeId: string;
  term: "season" | "per_event";
}) {
  const [racer] = await db.select().from(racers).where(eq(racers.id, params.racerId));
  if (!racer) throw new Error("Racer not found");

  const [sponsorship] = await db
    .insert(sponsorships)
    .values({
      listingId: params.listingId,
      racerId: params.racerId,
      sponsorUserId: params.sponsorUserId,
      amountUsd: params.amountUsd,
      platformFeeUsd: params.platformFeeUsd,
      trackRevShareUsd: params.trackRevShareUsd,
      racerNetUsd: params.racerNetUsd,
      stripeChargeId: params.stripeChargeId,
      // An adult racer has no guardian gate — go straight to awaiting the
      // decal photo. A minor's sale waits for the guardian to approve
      // this specific winner (section 2).
      status: racer.isMinor ? "pending_guardian_approval" : "charged_pending_decal",
    })
    .returning();

  await createSponsorshipAgreement({ sponsorshipId: sponsorship.id, term: params.term });

  await sendFinancialNotificationForRacer(params.racerId, {
    type: "sponsorship_sold",
    title: "A sponsorship sold on your profile",
    body: `$${params.amountUsd} — ${racer.isMinor ? "waiting on your approval as guardian" : "upload a photo of the decal to release funds"}.`,
    linkUrl: "/dashboard",
  });

  await logEvent(ANALYTICS_EVENTS.SPONSORSHIP_SOLD, { racerId: params.racerId, metadata: { amountUsd: params.amountUsd } });

  return sponsorship;
}

export async function approveWinnerAsGuardian(sponsorshipId: string, guardianUserId: string) {
  const [sponsorship] = await db.select().from(sponsorships).where(eq(sponsorships.id, sponsorshipId));
  if (!sponsorship) throw new Error("Sponsorship not found");
  if (sponsorship.status !== "pending_guardian_approval") {
    throw new Error(`Cannot approve a sponsorship in status "${sponsorship.status}"`);
  }

  const [link] = await db.select().from(guardianRacers).where(eq(guardianRacers.racerId, sponsorship.racerId));
  const [guardianRow] = link ? await db.select().from(guardians).where(eq(guardians.id, link.guardianId)) : [];
  if (!guardianRow || guardianRow.userId !== guardianUserId) {
    throw new Error("Only this racer's guardian can approve this sponsorship");
  }

  const [updated] = await db
    .update(sponsorships)
    .set({ guardianApprovedWinnerAt: new Date(), status: "charged_pending_decal" })
    .where(eq(sponsorships.id, sponsorshipId))
    .returning();
  return updated;
}

export async function uploadDecalPhoto(sponsorshipId: string, photoUrl: string) {
  const [sponsorship] = await db.select().from(sponsorships).where(eq(sponsorships.id, sponsorshipId));
  if (!sponsorship) throw new Error("Sponsorship not found");
  if (sponsorship.status !== "charged_pending_decal") {
    throw new Error(`Cannot upload a decal photo for a sponsorship in status "${sponsorship.status}"`);
  }

  const now = new Date();
  const autoReleaseAt = new Date(now.getTime() + CONFIG.escrowAutoReleaseDays * 24 * 60 * 60 * 1000);
  const [updated] = await db
    .update(sponsorships)
    .set({ decalPhotoUrl: photoUrl, decalUploadedAt: now, autoReleaseAt, status: "awaiting_sponsor_confirmation" })
    .where(eq(sponsorships.id, sponsorshipId))
    .returning();
  return updated;
}

type TransferFn = (params: { stripeAccountId: string; amountUsd: number; sponsorshipId: string }) => Promise<string>;

async function defaultTransfer({ stripeAccountId, amountUsd, sponsorshipId }: Parameters<TransferFn>[0]): Promise<string> {
  const stripe = getStripeClient();
  const transfer = await stripe.transfers.create({
    amount: Math.round(amountUsd * 100),
    currency: "usd",
    destination: stripeAccountId,
    transfer_group: `sponsorship_${sponsorshipId}`,
  });
  return transfer.id;
}

/**
 * The actual money movement — section 7: "charge the sponsor to the
 * platform account, then transfer to the racer's connected account when
 * the condition is met." `transferFn` is injectable so the state-machine
 * transition can be tested without a live Stripe connection; production
 * callers never pass it and get the real Stripe transfer.
 */
export async function releaseEscrow(sponsorshipId: string, transferFn: TransferFn = defaultTransfer) {
  const [sponsorship] = await db.select().from(sponsorships).where(eq(sponsorships.id, sponsorshipId));
  if (!sponsorship) throw new Error("Sponsorship not found");
  if (sponsorship.status !== "awaiting_sponsor_confirmation") {
    throw new Error(`Cannot release a sponsorship in status "${sponsorship.status}"`);
  }

  const [racer] = await db.select().from(racers).where(eq(racers.id, sponsorship.racerId));
  if (!racer) throw new Error("Racer not found");

  const owner = await getPayoutAccountOwnerForRacer(racer);
  if (!owner) throw new Error("No payout account owner (guardian/racer) found — cannot release funds");

  const [connectAccount] = await db.select().from(connectAccounts).where(eq(connectAccounts.ownerId, owner.ownerId));
  if (!connectAccount) throw new Error("No connected Stripe account on file for the payout recipient");

  const transferId = await transferFn({ stripeAccountId: connectAccount.stripeAccountId, amountUsd: sponsorship.racerNetUsd, sponsorshipId });

  const [updated] = await db
    .update(sponsorships)
    .set({ stripeTransferId: transferId, releasedAt: new Date(), status: "released" })
    .where(eq(sponsorships.id, sponsorshipId))
    .returning();

  await sendFinancialNotificationForRacer(sponsorship.racerId, {
    type: "payout_released",
    title: "Payout released",
    body: `$${sponsorship.racerNetUsd} has been transferred to your account.`,
  });

  return updated;
}

export async function confirmBySponsor(sponsorshipId: string, sponsorUserId: string, transferFn?: TransferFn) {
  const [sponsorship] = await db.select().from(sponsorships).where(eq(sponsorships.id, sponsorshipId));
  if (!sponsorship) throw new Error("Sponsorship not found");
  if (sponsorship.sponsorUserId !== sponsorUserId) throw new Error("Only the sponsor on this sponsorship can confirm it");
  if (sponsorship.status !== "awaiting_sponsor_confirmation") {
    throw new Error(`Cannot confirm a sponsorship in status "${sponsorship.status}"`);
  }

  await db.update(sponsorships).set({ sponsorConfirmedAt: new Date() }).where(eq(sponsorships.id, sponsorshipId));
  return releaseEscrow(sponsorshipId, transferFn);
}

/**
 * Section 7: "sponsor confirms, or seven days elapse." Cron-callable
 * sweep (wired to Vercel Cron in Phase 6) — releases every sponsorship
 * whose 7-day window has passed without an explicit sponsor confirmation.
 */
export async function runAutoReleaseSweep(now: Date = new Date(), transferFn?: TransferFn) {
  const due = await db.select().from(sponsorships);
  const eligible = due.filter((s) => s.status === "awaiting_sponsor_confirmation" && s.autoReleaseAt && s.autoReleaseAt <= now);

  const results = [];
  for (const sponsorship of eligible) {
    results.push(await releaseEscrow(sponsorship.id, transferFn));
  }
  return { releasedCount: results.length };
}
