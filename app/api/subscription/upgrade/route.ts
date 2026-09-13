import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripeClient } from "@/lib/stripe/client";
import { CONFIG } from "@/lib/config";

/** Section 7: Pro at $CONFIG.proAnnualUsd/year, dropping the take rate. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const stripe = getStripeClient();
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: session.user.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `${CONFIG.platformName} Pro` },
          unit_amount: Math.round(CONFIG.proAnnualUsd * 100),
          recurring: { interval: "year" },
        },
        quantity: 1,
      },
    ],
    metadata: { userId: session.user.id },
    success_url: `https://${CONFIG.domain}/dashboard?upgraded=true`,
    cancel_url: `https://${CONFIG.domain}/dashboard`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
