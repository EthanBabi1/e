import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { approveWinnerAsGuardian } from "@/lib/sponsorships/escrow";

const BodySchema = z.object({ sponsorshipId: z.string() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = BodySchema.parse(await req.json());

  try {
    const updated = await approveWinnerAsGuardian(body.sponsorshipId, session.user.id);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Approval failed" }, { status: 400 });
  }
}
