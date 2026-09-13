import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { reportThread } from "@/lib/messaging/threads";

const BodySchema = z.object({ threadId: z.string(), reason: z.string().min(1).max(1000) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = BodySchema.parse(await req.json());
  await reportThread(body.threadId, session.user.id, body.reason);
  return NextResponse.json({ ok: true });
}
