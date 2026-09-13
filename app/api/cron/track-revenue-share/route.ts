import { NextRequest, NextResponse } from "next/server";
import { runMonthlyTrackRevShare } from "@/lib/tracks/revenueShare";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runMonthlyTrackRevShare();
  return NextResponse.json(result);
}
