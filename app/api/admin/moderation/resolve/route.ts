import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { resolveLogoReport, resolveTakedownRequest } from "@/lib/admin/moderation";

const BodySchema = z.object({ kind: z.enum(["logo", "takedown"]), id: z.string(), resolution: z.enum(["resolved", "rejected"]) });

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = BodySchema.parse(await req.json());
  if (body.kind === "logo") await resolveLogoReport(body.id, body.resolution);
  else await resolveTakedownRequest(body.id, body.resolution);

  return NextResponse.json({ ok: true });
}
