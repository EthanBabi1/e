import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseResultsCsv } from "@/lib/ingest/csv/parse";
import type { CanonicalField } from "@/lib/ingest/csv/columnMapping";
import { createDraftBatch } from "@/lib/ingest/shared/drafts";
import { findOrCreateEventSession } from "@/lib/ingest/shared/session";
import { db } from "@/db/client";
import { trackIngestPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";

const BodySchema = z.object({
  trackId: z.string(),
  eventName: z.string(),
  eventDate: z.string(),
  sessionType: z.enum(["practice", "qualifying", "race"]),
  className: z.string(),
  csvText: z.string(),
  useRememberedMapping: z.boolean().default(true),
});

/** Path C (section 3): CSV/paste with per-track column-mapping memory. */
export async function POST(req: NextRequest) {
  const body = BodySchema.parse(await req.json());

  let overrideMapping: Partial<Record<CanonicalField, number>> | undefined;
  if (body.useRememberedMapping) {
    const [pref] = await db.select().from(trackIngestPreferences).where(eq(trackIngestPreferences.trackId, body.trackId));
    if (pref && Object.keys(pref.lastColumnMapping).length > 0) {
      overrideMapping = pref.lastColumnMapping as Partial<Record<CanonicalField, number>>;
    }
  }

  const { columnMapping, rows } = parseResultsCsv(body.csvText, overrideMapping);

  await db
    .insert(trackIngestPreferences)
    .values({ trackId: body.trackId, lastColumnMapping: columnMapping as Record<string, number> })
    .onConflictDoUpdate({
      target: trackIngestPreferences.trackId,
      set: { lastColumnMapping: columnMapping as Record<string, number>, updatedAt: new Date() },
    });

  const { session } = await findOrCreateEventSession({
    trackId: body.trackId,
    eventName: body.eventName,
    eventDate: body.eventDate,
    sessionType: body.sessionType,
    className: body.className,
  });

  const batch = await createDraftBatch({
    path: "csv",
    trackId: body.trackId,
    sessionId: session.id,
    className: body.className,
    provenanceDefault: "source_linked",
    rows: rows.map((r) => ({
      position: r.position,
      kartNumber: r.kartNumber,
      driverName: r.driverName,
      laps: r.laps,
      bestLapMs: r.bestLapMs,
      totalTimeMs: r.totalTimeMs,
      gapMs: r.gapMs,
      status: r.status,
    })),
    sourceMeta: { columnMapping },
  });

  return NextResponse.json(batch);
}
