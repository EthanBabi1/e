import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { racers, takedownRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email/send";
import { GenericNotificationEmail } from "@/lib/email/templates/GenericNotificationEmail";
import { CONFIG } from "@/lib/config";

const BodySchema = z.object({
  racerSlugOrName: z.string().min(1),
  requestedByEmail: z.string().email(),
  reason: z.string().max(1000).optional(),
});

/**
 * Section 3: "A public /remove route where a racer, a parent, or a track
 * can request takedown of an unclaimed profile with no account and no
 * argument. Honour it within 48 hours, admin-notified immediately."
 */
export async function POST(req: NextRequest) {
  const body = BodySchema.parse(await req.json());

  const [racer] = await db.select().from(racers).where(eq(racers.slug, body.racerSlugOrName));

  const [request] = await db
    .insert(takedownRequests)
    .values({
      racerId: racer?.id,
      requestedByEmail: body.requestedByEmail,
      reason: body.reason,
    })
    .returning();

  // "Admin-notified immediately" — a real deployment would route this to a
  // support inbox or on-call alert; owner email is the stand-in here.
  await sendEmail({
    to: CONFIG.ownerEmail,
    subject: "New profile takedown request",
    react: GenericNotificationEmail({
      title: "New takedown request",
      body: `${body.requestedByEmail} requested removal of "${body.racerSlugOrName}"${body.reason ? `: ${body.reason}` : "."} Respond within 48 hours.`,
      linkUrl: "/admin/moderation",
    }),
  });

  return NextResponse.json({ id: request.id });
}
