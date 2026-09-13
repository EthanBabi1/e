import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { placeBid } from "@/lib/sponsorships/bidding";

const BodySchema = z.object({ listingId: z.string(), amountUsd: z.number().positive(), setupIntentId: z.string() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = BodySchema.parse(await req.json());
  const result = await placeBid({
    listingId: body.listingId,
    sponsorUserId: session.user.id,
    amountUsd: body.amountUsd,
    stripeSetupIntentId: body.setupIntentId,
  });
  return NextResponse.json(result);
}
