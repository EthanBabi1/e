import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { racers } from "@/db/schema";
import { getManagedRacers } from "@/lib/dashboard/getCurrentRacer";
import { logEvent, ANALYTICS_EVENTS } from "@/lib/analytics/events";

const BodySchema = z.object({
  racerId: z.string(),
  bio: z.string().max(2000).nullable(),
  story: z.string().max(2000).nullable(),
  seasonGoal: z.string().max(500).nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = BodySchema.parse(await req.json());

  // Ownership check — only the racer themself or their guardian can edit.
  const managed = await getManagedRacers(session.user.id);
  if (!managed.some((r) => r.id === body.racerId)) {
    return NextResponse.json({ error: "You don't have access to this profile" }, { status: 403 });
  }

  await db.update(racers).set({ bio: body.bio, story: body.story, seasonGoal: body.seasonGoal }).where(eq(racers.id, body.racerId));

  const [racer] = await db.select().from(racers).where(eq(racers.id, body.racerId));
  const hasCompletedProfile = Boolean(racer?.story && racer?.photoUrl);
  if (hasCompletedProfile) {
    await logEvent(ANALYTICS_EVENTS.PROFILE_COMPLETED, { racerId: body.racerId, userId: session.user.id });
  }

  return NextResponse.json({ ok: true });
}
