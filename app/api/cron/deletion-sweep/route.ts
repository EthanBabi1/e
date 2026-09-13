import { NextRequest, NextResponse } from "next/server";
import { runDeletionPurgeSweep } from "@/lib/accounts/deletion";

/**
 * Section 3: an adult's own deletion request gets a 90-day restorable
 * hold, then purges. Wired to Vercel Cron (vercel.json); guarded by a
 * shared secret so it can't be triggered by an arbitrary request.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDeletionPurgeSweep();
  return NextResponse.json(result);
}
