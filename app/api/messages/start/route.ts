import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getOrCreateThread, sendMessage } from "@/lib/messaging/threads";

const BodySchema = z.object({ racerId: z.string(), zoneListingId: z.string().optional(), body: z.string().min(1).max(4000) });

/** Section 6: "An enquiry form on the profile opens a thread." */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = BodySchema.parse(await req.json());
  const thread = await getOrCreateThread({ racerId: body.racerId, sponsorUserId: session.user.id, zoneListingId: body.zoneListingId });
  const result = await sendMessage({ threadId: thread.id, senderUserId: session.user.id, body: body.body });

  return NextResponse.json({ threadId: thread.id, result });
}
