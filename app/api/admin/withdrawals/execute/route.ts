import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiWithAudit } from "@/lib/admin/requireAdminApi";
import { processWithdrawal } from "@/lib/sponsorships/withdrawal";

const BodySchema = z.object({ sponsorshipId: z.string(), mode: z.enum(["refund", "credit"]) });

export async function POST(req: NextRequest) {
  const body = BodySchema.parse(await req.json());
  const { denied } = await requireAdminApiWithAudit("withdrawal_executed", { sponsorshipId: body.sponsorshipId, mode: body.mode });
  if (denied) return denied;

  try {
    const result = await processWithdrawal(body.sponsorshipId, body.mode);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Withdrawal failed" }, { status: 400 });
  }
}
