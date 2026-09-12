import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { results, raceSessions, events } from "@/db/schema";
import { validateSessionRows, hasBlockingIssues, type DraftResultRow } from "@/lib/ingest/shared/validation";
import { getTrackRecordMs } from "@/lib/ingest/shared/trackRecords";
import { publishIngestBatch } from "@/lib/ingest/shared/publish";

const BodySchema = z.object({
  batchId: z.string(),
  decisions: z.array(z.object({ resultId: z.string(), racerId: z.string().nullable() })),
});

/**
 * The shared publish step (section 3). Re-runs validation server-side
 * (never trusts the client to have honored what the review screen showed)
 * and refuses to publish if any row still has a blocking issue.
 */
export async function POST(req: NextRequest) {
  const body = BodySchema.parse(await req.json());

  const rows = await db
    .select({
      id: results.id,
      position: results.position,
      bestLapMs: results.bestLapMs,
      laps: results.laps,
      trackId: events.trackId,
      className: raceSessions.className,
    })
    .from(results)
    .innerJoin(raceSessions, eq(results.sessionId, raceSessions.id))
    .innerJoin(events, eq(raceSessions.eventId, events.id))
    .where(eq(results.ingestBatchId, body.batchId));

  if (rows.length === 0) {
    return NextResponse.json({ error: "Batch not found or already published" }, { status: 404 });
  }

  // All rows in one batch share a track/class (one upload = one session context).
  const className = rows[0].className;
  const trackRecordMs = await getTrackRecordMs(rows[0].trackId, className);

  const validationRows: DraftResultRow[] = rows.map((r, i) => ({
    rowIndex: i,
    position: r.position,
    bestLapMs: r.bestLapMs,
    laps: r.laps,
  }));
  const issues = validateSessionRows(validationRows, { trackRecordMs, expectedLapCount: null });

  if (hasBlockingIssues(issues)) {
    return NextResponse.json(
      { error: "This batch has unresolved blocking issues and cannot be published yet.", issues: Object.fromEntries(issues) },
      { status: 422 }
    );
  }

  const result = await publishIngestBatch(body.batchId, body.decisions);
  return NextResponse.json(result);
}
