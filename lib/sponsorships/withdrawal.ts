import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sponsorshipAgreements, sponsorships } from "@/db/schema";
import { getStripeClient } from "@/lib/stripe/client";

/**
 * Section 6's withdrawal policy default: "pro-rata refund of the unserved
 * portion, funded from the racer's balance, with a sponsor-credit
 * alternative they can choose instead." Pure function — the fraction of
 * the term not yet served, applied to the original amount.
 */
export function computeProRataUnservedUsd(params: { amountUsd: number; termStart: Date; termEnd: Date; now?: Date }): number {
  const now = params.now ?? new Date();
  const totalMs = params.termEnd.getTime() - params.termStart.getTime();
  if (totalMs <= 0) return 0;
  const servedMs = Math.min(Math.max(now.getTime() - params.termStart.getTime(), 0), totalMs);
  const unservedFraction = 1 - servedMs / totalMs;
  return Math.round(params.amountUsd * unservedFraction * 100) / 100;
}

type RefundFn = (params: { stripeChargeId: string; amountUsd: number }) => Promise<void>;

async function defaultRefund({ stripeChargeId, amountUsd }: Parameters<RefundFn>[0]): Promise<void> {
  const stripe = getStripeClient();
  await stripe.refunds.create({ charge: stripeChargeId, amount: Math.round(amountUsd * 100) });
}

/**
 * Section 6: admin tooling to execute the withdrawal policy. `mode`
 * chooses which alternative the sponsor picked — a real refund funded
 * from what would have been the racer's remaining payout, or a credit
 * they can apply to a future season (recorded, not paid out as cash).
 */
export async function processWithdrawal(
  sponsorshipId: string,
  mode: "refund" | "credit",
  refundFn: RefundFn = defaultRefund
) {
  const [sponsorship] = await db.select().from(sponsorships).where(eq(sponsorships.id, sponsorshipId));
  if (!sponsorship) throw new Error("Sponsorship not found");
  if (sponsorship.status === "withdrawn" || sponsorship.status === "refunded") {
    throw new Error(`Sponsorship is already in a terminal state: "${sponsorship.status}"`);
  }

  const [agreement] = await db.select().from(sponsorshipAgreements).where(eq(sponsorshipAgreements.sponsorshipId, sponsorshipId));
  if (!agreement) throw new Error("No agreement on file for this sponsorship — cannot compute the unserved portion");

  const unservedUsd = computeProRataUnservedUsd({
    amountUsd: sponsorship.amountUsd,
    termStart: new Date(agreement.termStart),
    termEnd: new Date(agreement.termEnd),
  });

  if (mode === "refund") {
    if (!sponsorship.stripeChargeId) throw new Error("No charge on file to refund");
    await refundFn({ stripeChargeId: sponsorship.stripeChargeId, amountUsd: unservedUsd });
    await db
      .update(sponsorships)
      .set({ status: "refunded", withdrawnAt: new Date(), refundAmountUsd: unservedUsd })
      .where(eq(sponsorships.id, sponsorshipId));
  } else {
    await db
      .update(sponsorships)
      .set({ status: "withdrawn", withdrawnAt: new Date(), sponsorCreditUsd: unservedUsd })
      .where(eq(sponsorships.id, sponsorshipId));
  }

  return { unservedUsd };
}
