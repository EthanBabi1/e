import { NextRequest, NextResponse } from "next/server";
import { generateResultsCsv } from "@/lib/export/csv";

/**
 * Section 3 permanence promise: one-click export, any tier, any time —
 * never gated behind Pro. Real auth (Phase 4) will check the requester is
 * the racer, their guardian, or an admin; this route has no auth yet, same
 * caveat as /admin in Phase 1.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ racerId: string }> }) {
  const { racerId } = await params;
  const csv = await generateResultsCsv(racerId);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="racer-${racerId}-results.csv"`,
    },
  });
}
