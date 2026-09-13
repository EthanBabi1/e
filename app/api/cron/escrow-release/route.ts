import { NextRequest, NextResponse } from "next/server";
import { runAutoReleaseSweep } from "@/lib/sponsorships/escrow";

/**
 * Section 7: "sponsor confirms, or seven days elapse." Wired to Vercel
 * Cron in Phase 6 (vercel.json); callable directly for now, guarded by a
 * shared secret so it can't be triggered by an arbitrary request.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runAutoReleaseSweep();
  return NextResponse.json(result);
}
