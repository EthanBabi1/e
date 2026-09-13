import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { guardianRacers, guardians, racers, zoneListings, zones } from "@/db/schema";

const BodySchema = z.object({ listingId: z.string() });

/** Section 2: guardian approves a minor's listing before it goes public. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = BodySchema.parse(await req.json());
  const [row] = await db
    .select({ listing: zoneListings, racer: racers })
    .from(zoneListings)
    .innerJoin(zones, eq(zoneListings.zoneId, zones.id))
    .innerJoin(racers, eq(zones.racerId, racers.id))
    .where(eq(zoneListings.id, body.listingId));
  if (!row) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const [link] = await db.select().from(guardianRacers).where(eq(guardianRacers.racerId, row.racer.id));
  const [guardianRow] = link ? await db.select().from(guardians).where(eq(guardians.id, link.guardianId)) : [];
  if (!guardianRow || guardianRow.userId !== session.user.id) {
    return NextResponse.json({ error: "Only this racer's guardian can approve this listing" }, { status: 403 });
  }

  const [updated] = await db
    .update(zoneListings)
    .set({ guardianApprovedAt: new Date(), isActive: true })
    .where(eq(zoneListings.id, body.listingId))
    .returning();
  return NextResponse.json(updated);
}
