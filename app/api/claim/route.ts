import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { claimAsAdult, claimAsGuardian } from "@/lib/accounts/claim";
import { db } from "@/db/client";
import { policyVersions, racers } from "@/db/schema";

const BodySchema = z.object({
  racerId: z.string(),
  token: z.string().optional(),
  relationship: z.string().optional(), // required when claiming as guardian
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = BodySchema.parse(await req.json());

  try {
    const [racer] = await db.select().from(racers).where(eq(racers.id, body.racerId));
    if (!racer) return NextResponse.json({ error: "Racer not found" }, { status: 404 });

    if (racer.isMinor) {
      if (!body.relationship) {
        return NextResponse.json({ error: "Relationship to the racer is required for a guardian claim" }, { status: 400 });
      }
      const [consentPolicy] = await db
        .select()
        .from(policyVersions)
        .where(eq(policyVersions.slug, "minor-display-consent"));
      if (!consentPolicy) return NextResponse.json({ error: "Consent policy not found. Run the seed script." }, { status: 500 });

      await claimAsGuardian({
        racerId: body.racerId,
        guardianUserId: session.user.id,
        relationship: body.relationship,
        consentPolicyVersionId: consentPolicy.id,
        invitationToken: body.token,
      });
    } else {
      await claimAsAdult({ racerId: body.racerId, userId: session.user.id, invitationToken: body.token });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Claim failed" }, { status: 400 });
  }
}
