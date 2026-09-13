import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { confirmAndImportMylapsSessions } from "@/lib/ingest/mylaps/confirm";
import { FEATURE_FLAGS } from "@/lib/config";

const LapSchema = z.object({ lapNumber: z.number(), lapTimeMs: z.number() });
const SessionSchema = z.object({
  trackName: z.string(),
  eventName: z.string(),
  eventDate: z.string(),
  sessionType: z.enum(["practice", "qualifying", "race"]),
  className: z.string(),
  position: z.number().nullable(),
  laps: z.array(LapSchema),
  status: z.enum(["finished", "dnf", "dns"]),
  upstreamEventId: z.string(),
  upstreamSessionId: z.string(),
  upstreamResultId: z.string(),
});

const BodySchema = z.object({ racerId: z.string(), sessions: z.array(SessionSchema) });

/** Racer confirmed "yes, these are my sessions" — section 3. */
export async function POST(req: NextRequest) {
  if (!FEATURE_FLAGS.mylapsImport) {
    return NextResponse.json({ error: "MYLAPS import is disabled. See DATA-ACCESS.md" }, { status: 503 });
  }
  const body = BodySchema.parse(await req.json());
  const result = await confirmAndImportMylapsSessions(body.racerId, body.sessions);
  return NextResponse.json(result);
}
