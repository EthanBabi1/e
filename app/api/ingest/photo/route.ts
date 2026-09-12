import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractResultsFromImage, ExtractionUnavailableError } from "@/lib/ingest/vision/extract";
import { parseTimeToMs } from "@/lib/ingest/csv/timeParsing";
import { createDraftBatch } from "@/lib/ingest/shared/drafts";
import { findOrCreateEventSession } from "@/lib/ingest/shared/session";

const BodySchema = z.object({
  trackId: z.string(),
  eventName: z.string(),
  eventDate: z.string(),
  sessionType: z.enum(["practice", "qualifying", "race"]),
  className: z.string(),
  images: z.array(z.string()).min(1), // base64, no data: prefix
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
});

/**
 * Path B (section 3) — primary ingest path in this build (see
 * DATA-ACCESS.md). Never auto-publishes: rows land as drafts for the
 * shared review screen, same as CSV/manual.
 */
export async function POST(req: NextRequest) {
  const body = BodySchema.parse(await req.json());

  let extraction;
  try {
    extraction = await extractResultsFromImage({ imageBase64: body.images, mediaType: body.mediaType });
  } catch (err) {
    if (err instanceof ExtractionUnavailableError) {
      return NextResponse.json({ error: err.message, fallback: "manual" }, { status: 503 });
    }
    throw err;
  }

  const { session } = await findOrCreateEventSession({
    trackId: body.trackId,
    eventName: body.eventName,
    eventDate: body.eventDate,
    sessionType: body.sessionType,
    className: body.className,
  });

  // A sheet can carry multiple classes (section 3) — only rows matching
  // the class the uploader told us they're entering go into this batch;
  // the rest are returned so the UI can offer "import these into a
  // different class" as a follow-up action rather than silently dropping them.
  const matchingRows = extraction.rows.filter((r) => !r.class || r.class.toLowerCase() === body.className.toLowerCase());
  const otherClassRows = extraction.rows.filter((r) => r.class && r.class.toLowerCase() !== body.className.toLowerCase());

  const batch = await createDraftBatch({
    path: "photo",
    trackId: body.trackId,
    sessionId: session.id,
    className: body.className,
    provenanceDefault: "source_linked",
    rows: matchingRows.map((r) => ({
      position: r.position,
      kartNumber: r.kartNumber,
      driverName: r.driverName,
      laps: r.laps,
      bestLapMs: parseTimeToMs(r.bestLap),
      totalTimeMs: parseTimeToMs(r.totalTime),
      gapMs: parseTimeToMs(r.gap),
      status: r.status,
      confidence: r.confidence,
    })),
    sourceMeta: { extractionNotes: extraction.notes },
  });

  return NextResponse.json({
    ...batch,
    notes: extraction.notes,
    otherClassesFound: [...new Set(otherClassRows.map((r) => r.class))],
  });
}
