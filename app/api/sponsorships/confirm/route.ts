import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { confirmBySponsor } from "@/lib/sponsorships/escrow";

const BodySchema = z.object({ sponsorshipId: z.string() });

/** Section 7: sponsor confirms the decal is on the kart, releasing funds
 * immediately rather than waiting the full 7 days. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = BodySchema.parse(await req.json());

  try {
    const updated = await confirmBySponsor(body.sponsorshipId, session.user.id);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Confirmation failed" }, { status: 400 });
  }
}
