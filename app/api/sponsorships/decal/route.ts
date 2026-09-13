import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { sponsorships } from "@/db/schema";
import { uploadDecalPhoto } from "@/lib/sponsorships/escrow";
import { getManagedRacers } from "@/lib/dashboard/getCurrentRacer";
import { processUploadedImage } from "@/lib/images/process";
import { saveLocalUpload } from "@/lib/storage/local";

const BodySchema = z.object({ sponsorshipId: z.string(), imageBase64: z.string() });

/** Section 7: the racer (or guardian) uploads a photo of the decal on the
 * kart, starting the 7-day auto-release window. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = BodySchema.parse(await req.json());
  const [sponsorship] = await db.select().from(sponsorships).where(eq(sponsorships.id, body.sponsorshipId));
  if (!sponsorship) return NextResponse.json({ error: "Sponsorship not found" }, { status: 404 });

  const managed = await getManagedRacers(session.user.id);
  if (!managed.some((r) => r.id === sponsorship.racerId)) {
    return NextResponse.json({ error: "You don't have access to this sponsorship" }, { status: 403 });
  }

  const buffer = Buffer.from(body.imageBase64, "base64");
  const processed = await processUploadedImage(buffer);
  const photoUrl = await saveLocalUpload(processed.crops.hero.webp, "webp");

  try {
    const updated = await uploadDecalPhoto(body.sponsorshipId, photoUrl);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 400 });
  }
}
