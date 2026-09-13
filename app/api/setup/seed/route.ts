import { NextRequest, NextResponse } from "next/server";
import { runSeed } from "@/db/seed/index";

/**
 * One-time manual bootstrap for an environment with no CLI/shell access
 * (e.g. a fresh Vercel + Neon deploy) to load the fictional demo dataset.
 * Gated by CRON_SECRET (already required for this deployment) rather than
 * a dedicated credential, since this is a stopgap for initial setup, not
 * a feature meant to stay reachable long-term — safe to delete this route
 * once the environment has been seeded.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await runSeed();
  return NextResponse.json({ seeded: true });
}
