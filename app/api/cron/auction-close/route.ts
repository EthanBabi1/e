import { NextRequest, NextResponse } from "next/server";
import { closeExpiredAuctions } from "@/lib/sponsorships/auctionClose";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await closeExpiredAuctions();
  return NextResponse.json(result);
}
