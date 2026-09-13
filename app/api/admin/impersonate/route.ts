import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireAdminApiWithAudit } from "@/lib/admin/requireAdminApi";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getManagedRacers } from "@/lib/dashboard/getCurrentRacer";
import { getSponsorshipsForUser } from "@/lib/sponsorships/getForUser";

const BodySchema = z.object({ email: z.string().email() });

/**
 * Section 13: "user impersonation for support — logged, always, with the
 * user informed in the audit trail." Scoped here as a read-only "view what
 * support would see," not a full session takeover — this build has no
 * mechanism to notify the impersonated user in-product yet (that's a
 * notification-system addition, not an auth one), so a full act-as
 * capability would create exactly the kind of silent access the brief's
 * own phrase ("the user informed") is guarding against. Flagged in
 * REVIEW.md as a narrower interpretation worth revisiting.
 */
export async function POST(req: NextRequest) {
  const body = BodySchema.parse(await req.json());
  const { denied } = await requireAdminApiWithAudit("impersonation_view", { targetEmail: body.email });
  if (denied) return denied;

  const [user] = await db.select().from(users).where(eq(users.email, body.email));
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [managedRacers, sponsorships] = await Promise.all([getManagedRacers(user.id), getSponsorshipsForUser(user.id)]);

  return NextResponse.json({
    user: { id: user.id, email: user.email, role: user.role },
    managedRacers: managedRacers.map((r) => ({ id: r.id, slug: r.slug, name: `${r.firstName} ${r.lastName}` })),
    sponsorshipCount: sponsorships.length,
  });
}
