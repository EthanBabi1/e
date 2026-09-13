import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { racers, tracks, zoneListings, zones } from "@/db/schema";
import { getStripeClient } from "@/lib/stripe/client";
import { CONFIG } from "@/lib/config";

const BodySchema = z.object({ listingId: z.string() });

/**
 * Section 7: "charge the sponsor to the platform account, then transfer
 * to the racer's connected account when the condition is met." This
 * route only creates the platform-account charge (a Checkout Session);
 * the transfer/escrow state machine (lib/sponsorships/escrow.ts) only
 * runs once the webhook confirms payment — see /api/stripe/webhook.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = BodySchema.parse(await req.json());

  const [row] = await db
    .select({ listing: zoneListings, zone: zones, racer: racers, track: tracks })
    .from(zoneListings)
    .innerJoin(zones, eq(zoneListings.zoneId, zones.id))
    .innerJoin(racers, eq(zones.racerId, racers.id))
    .leftJoin(tracks, eq(racers.homeTrackId, tracks.id))
    .where(eq(zoneListings.id, body.listingId));

  if (!row) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  const { listing, zone, racer } = row;

  if (!listing.isActive || listing.listingType !== "buy_now" || listing.priceUsd == null) {
    return NextResponse.json({ error: "This listing isn't available for direct purchase" }, { status: 400 });
  }
  // Defense in depth — the marketplace/profile queries already filter
  // this out, but checkout re-checks the same gate independently.
  if (racer.isMinor && !listing.guardianApprovedAt) {
    return NextResponse.json({ error: "This listing hasn't been approved by a guardian yet" }, { status: 403 });
  }

  const stripe = getStripeClient();
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: session.user.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `${zone.name}, ${racer.firstName} ${racer.lastName.charAt(0)}.` },
          unit_amount: Math.round(listing.priceUsd * 100),
        },
        quantity: 1,
      },
    ],
    metadata: { listingId: listing.id, racerId: racer.id, sponsorUserId: session.user.id },
    success_url: `https://${CONFIG.domain}/dashboard?checkout=success`,
    cancel_url: `https://${CONFIG.domain}/racers/${racer.slug}?checkout=cancelled`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
