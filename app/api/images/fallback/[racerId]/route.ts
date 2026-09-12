import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { racers, tracks } from "@/db/schema";
import { generateFallbackImage } from "@/lib/images/fallback";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ racerId: string }> }) {
  const { racerId } = await params;
  const [racer] = await db.select().from(racers).where(eq(racers.id, racerId));
  if (!racer) return new NextResponse("Not found", { status: 404 });

  let trackName: string | null = null;
  if (racer.homeTrackId) {
    const [track] = await db.select({ name: tracks.name }).from(tracks).where(eq(tracks.id, racer.homeTrackId));
    trackName = track?.name ?? null;
  }

  const png = await generateFallbackImage({
    seed: racer.id,
    raceNumber: racer.numberDefault,
    className: racer.classDefault,
    trackName,
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
