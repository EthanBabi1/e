import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { messageThreads } from "@/db/schema";
import { sendMessage } from "@/lib/messaging/threads";

const BodySchema = z.object({ threadId: z.string(), body: z.string().min(1).max(4000) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = BodySchema.parse(await req.json());
  const [thread] = await db.select().from(messageThreads).where(eq(messageThreads.id, body.threadId));
  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  const isParticipant = [thread.sponsorUserId, thread.guardianUserId].includes(session.user.id);
  if (!isParticipant) return NextResponse.json({ error: "Not a participant in this thread" }, { status: 403 });

  const result = await sendMessage({ threadId: body.threadId, senderUserId: session.user.id, body: body.body });
  return NextResponse.json(result);
}
