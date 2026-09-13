import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { racers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requestDeletion } from "@/lib/accounts/deletion";
import { getManagedRacers } from "@/lib/dashboard/getCurrentRacer";

const BodySchema = z.object({ racerId: z.string() });

/**
 * Section 3: "we will never delete your record — only you can." A
 * guardian requesting deletion of their minor executes immediately; an
 * adult requesting their own gets the 90-day hold + restore path.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = BodySchema.parse(await req.json());
  const managed = await getManagedRacers(session.user.id);
  const racer = managed.find((r) => r.id === body.racerId);
  if (!racer) return NextResponse.json({ error: "You don't have access to this profile" }, { status: 403 });

  const [freshRacer] = await db.select().from(racers).where(eq(racers.id, body.racerId));
  const isGuardianOfMinor = freshRacer.isMinor && freshRacer.userId !== session.user.id;

  const result = await requestDeletion({ racerId: body.racerId, requestedByUserId: session.user.id, isGuardianOfMinor });
  return NextResponse.json(result);
}
