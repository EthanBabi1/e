import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createDraftBatch } from "@/lib/ingest/shared/drafts";
import { findOrCreateEventSession } from "@/lib/ingest/shared/session";
import { parseTimeToMs, parseIntOrNull } from "@/lib/ingest/csv/timeParsing";

// Times/laps arrive as the racer typed them ("38.45", "1:02.3") — parsed
// server-side with the same logic as the CSV path so "62.45" and "1:02.45"
// are handled identically everywhere in the product (section 3).
const RowSchema = z.object({
  position: z.string().nullable(),
  kartNumber: z.string().nullable(),
  driverName: z.string().nullable(),
  laps: z.string().nullable(),
  bestLap: z.string().nullable(),
  totalTime: z.string().nullable(),
  gap: z.string().nullable(),
  status: z.enum(["finished", "dnf", "dns", "dq"]).default("finished"),
});

const BodySchema = z.object({
  trackId: z.string(),
  eventName: z.string(),
  eventDate: z.string(),
  sessionType: z.enum(["practice", "qualifying", "race"]),
  className: z.string(),
  rows: z.array(RowSchema),
});

/** Path D (section 3): keyboard-driven manual entry grid. */
export async function POST(req: NextRequest) {
  const body = BodySchema.parse(await req.json());

  const { session } = await findOrCreateEventSession({
    trackId: body.trackId,
    eventName: body.eventName,
    eventDate: body.eventDate,
    sessionType: body.sessionType,
    className: body.className,
  });

  const batch = await createDraftBatch({
    path: "manual",
    trackId: body.trackId,
    sessionId: session.id,
    className: body.className,
    provenanceDefault: "self_reported",
    rows: body.rows.map((r) => ({
      position: parseIntOrNull(r.position),
      kartNumber: r.kartNumber,
      driverName: r.driverName,
      laps: parseIntOrNull(r.laps),
      bestLapMs: parseTimeToMs(r.bestLap),
      totalTimeMs: parseTimeToMs(r.totalTime),
      gapMs: parseTimeToMs(r.gap),
      status: r.status,
    })),
  });

  return NextResponse.json(batch);
}
