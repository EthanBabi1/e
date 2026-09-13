import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripeClient } from "@/lib/stripe/client";
import { placeBid } from "@/lib/sponsorships/bidding";
import { CONFIG } from "@/lib/config";

/** Redirect target after the card-saving Checkout Session completes —
 * records the bid now that a payment method is on file. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(`https://${CONFIG.domain}/sign-in`);

  const sessionId = req.nextUrl.searchParams.get("session_id");
  const listingId = req.nextUrl.searchParams.get("listingId");
  const amountUsd = Number(req.nextUrl.searchParams.get("amountUsd"));
  if (!sessionId || !listingId || !amountUsd) {
    return NextResponse.redirect(`https://${CONFIG.domain}/marketplace`);
  }

  const stripe = getStripeClient();
  const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
  const setupIntentId = String(checkoutSession.setup_intent);

  const result = await placeBid({ listingId, sponsorUserId: session.user.id, amountUsd, stripeSetupIntentId: setupIntentId });

  const redirectUrl = new URL(`https://${CONFIG.domain}/marketplace`);
  redirectUrl.searchParams.set("bidStatus", result.status);
  return NextResponse.redirect(redirectUrl);
}
