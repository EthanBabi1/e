import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { racers, zoneListings, zones } from "@/db/schema";
import { getManagedRacers } from "@/lib/dashboard/getCurrentRacer";
import { computeSuggestedRange, validateZonePrice } from "@/lib/pricing/zonePricing";
import { getRacerResults } from "@/lib/telemetry";

const BodySchema = z.object({
  zoneId: z.string(),
  listingType: z.enum(["buy_now", "auction"]),
  term: z.enum(["season", "per_event"]),
  priceUsd: z.number().optional(),
  startingBidUsd: z.number().optional(),
});

/**
 * Section 4's price floor/ceiling — the DoD requirement ("No listing can
 * be created below the price floor") is enforced here, at the write path,
 * not just in the pricing-suggestion UI, so there is no way to POST
 * around a client-side warning.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = BodySchema.parse(await req.json());
  const [zone] = await db.select().from(zones).where(eq(zones.id, body.zoneId));
  if (!zone) return NextResponse.json({ error: "Zone not found" }, { status: 404 });

  const managed = await getManagedRacers(session.user.id);
  if (!managed.some((r) => r.id === zone.racerId)) {
    return NextResponse.json({ error: "You don't have access to this racer's zones" }, { status: 403 });
  }

  const [racer] = await db.select().from(racers).where(eq(racers.id, zone.racerId));
  if (!racer) return NextResponse.json({ error: "Racer not found" }, { status: 404 });

  const results = await getRacerResults(racer.id);
  const raceCount = results.filter((r) => r.sessionType === "race").length;
  const suggestedRange = computeSuggestedRange({ tier: zone.tier, raceCount, audienceFollowing: racer.socialFollowingSelfReported });

  const priceToValidate = body.priceUsd ?? body.startingBidUsd;
  if (priceToValidate == null) {
    return NextResponse.json({ error: "A price or starting bid is required" }, { status: 400 });
  }

  const validation = validateZonePrice(priceToValidate, suggestedRange);
  if (validation.status === "block") {
    return NextResponse.json({ error: validation.message }, { status: 422 });
  }

  // Section 2: a minor's zone cannot be listed publicly until a guardian
  // has approved it — created inactive/unapproved, requiring a separate
  // guardian-approval action before `isActive` ever reaches the
  // marketplace or profile query filters.
  const [listing] = await db
    .insert(zoneListings)
    .values({
      zoneId: body.zoneId,
      listingType: body.listingType,
      term: body.term,
      priceUsd: body.priceUsd,
      startingBidUsd: body.startingBidUsd,
      isActive: !racer.isMinor,
      guardianApprovedAt: racer.isMinor ? null : new Date(),
    })
    .returning();

  return NextResponse.json({ listing, warning: validation.status === "warn" ? validation.message : null });
}
