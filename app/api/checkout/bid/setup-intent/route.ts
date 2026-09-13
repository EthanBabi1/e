import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getStripeClient } from "@/lib/stripe/client";
import { CONFIG } from "@/lib/config";

const BodySchema = z.object({ listingId: z.string(), amountUsd: z.number().positive() });

/**
 * Section EXISTING CODE: "SetupIntent saves a card, bidder charged only
 * on winning." Uses Stripe Checkout in `setup` mode rather than a
 * hand-built Elements form — it saves a card with no charge, and Stripe
 * hosts the whole card-collection UI, which is the same guarantee with
 * far less custom frontend code to get right around a payment form.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = BodySchema.parse(await req.json());
  const stripe = getStripeClient();

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "setup",
    customer_email: session.user.email,
    success_url: `https://${CONFIG.domain}/api/checkout/bid/complete?session_id={CHECKOUT_SESSION_ID}&listingId=${body.listingId}&amountUsd=${body.amountUsd}`,
    cancel_url: `https://${CONFIG.domain}/marketplace`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
