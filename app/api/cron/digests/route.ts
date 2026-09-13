import { NextRequest, NextResponse } from "next/server";
import { sendSponsorDigests, sendTrackRevenueDigests } from "@/lib/notifications/digests";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [sponsorResult, trackResult] = await Promise.all([sendSponsorDigests(), sendTrackRevenueDigests()]);
  return NextResponse.json({ sponsorDigestsSent: sponsorResult.sent, trackDigestsSent: trackResult.sent });
}
