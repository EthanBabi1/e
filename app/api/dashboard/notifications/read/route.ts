import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { notifications } from "@/db/schema";

const BodySchema = z.object({ notificationId: z.string().optional() }); // omit to mark all read

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = BodySchema.parse(await req.json());

  const condition = body.notificationId
    ? and(eq(notifications.userId, session.user.id), eq(notifications.id, body.notificationId))
    : eq(notifications.userId, session.user.id);

  await db.update(notifications).set({ readAt: new Date() }).where(condition);
  return NextResponse.json({ ok: true });
}
