import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { claimTrack } from "@/lib/tracks/claim";

const BodySchema = z.object({ trackId: z.string() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = BodySchema.parse(await req.json());

  try {
    const result = await claimTrack(body.trackId, session.user.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Claim failed" }, { status: 400 });
  }
}
