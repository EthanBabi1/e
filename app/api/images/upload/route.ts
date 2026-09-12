import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { processUploadedImage } from "@/lib/images/process";
import { saveLocalUpload } from "@/lib/storage/local";
import { db } from "@/db/client";
import { racers } from "@/db/schema";

const BodySchema = z.object({
  racerId: z.string(),
  imageBase64: z.string(),
});

/**
 * Racer profile photo upload (section 1). Storage is the local-disk stub
 * (see lib/storage/local.ts and REVIEW.md) — swap saveLocalUpload for a
 * real UploadThing/S3 client once credentials exist; nothing else here
 * changes. The quality gate never blocks the upload outright — a weak
 * photo is still saved and rendered "framed," per section 1's rule that
 * treatment (not rejection) is how quality is handled past the hard floor.
 */
export async function POST(req: NextRequest) {
  const body = BodySchema.parse(await req.json());
  const buffer = Buffer.from(body.imageBase64, "base64");

  const processed = await processUploadedImage(buffer);
  const heroUrl = await saveLocalUpload(processed.crops.avatar.webp, "webp");

  await db.update(racers).set({ photoUrl: heroUrl }).where(eq(racers.id, body.racerId));

  return NextResponse.json({
    photoUrl: heroUrl,
    treatment: processed.treatment,
    qualityMessage: processed.quality.message,
  });
}
