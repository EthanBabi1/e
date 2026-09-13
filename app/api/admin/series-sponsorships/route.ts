import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiWithAudit } from "@/lib/admin/requireAdminApi";
import { db } from "@/db/client";
import { seriesSponsorships } from "@/db/schema";

const BodySchema = z.object({
  seriesId: z.string(),
  className: z.string().nullable(),
  sponsorOrgName: z.string(),
  rateUsd: z.number().positive(),
  splitPlatformPct: z.number().min(0).max(100),
  splitTrackPct: z.number().min(0).max(100),
  splitRacersPct: z.number().min(0).max(100),
});

/** Section 7's biggest-ticket revenue line — admin-created manually, no
 * self-serve checkout in v1. */
export async function POST(req: NextRequest) {
  const body = BodySchema.parse(await req.json());
  const { denied } = await requireAdminApiWithAudit("series_sponsorship_created", body);
  if (denied) return denied;

  const [deal] = await db.insert(seriesSponsorships).values(body).returning();
  return NextResponse.json(deal);
}
