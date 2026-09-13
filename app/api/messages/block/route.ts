import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { blockUser } from "@/lib/messaging/threads";

const BodySchema = z.object({ userId: z.string() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = BodySchema.parse(await req.json());
  await blockUser(session.user.id, body.userId);
  return NextResponse.json({ ok: true });
}
