import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { ingestBatches, results } from "@/db/schema";
import { matchRacer, type MatchResult } from "./matching";
import { validateSessionRows, type DraftResultRow, type ValidationIssue } from "./validation";
import { getTrackRecordMs } from "./trackRecords";

export interface IncomingRow {
  position: number | null;
  kartNumber: string | null;
  driverName: string | null;
  laps: number | null;
  bestLapMs: number | null;
  totalTimeMs: number | null;
  gapMs: number | null;
  status: "finished" | "dnf" | "dns" | "dq";
  confidence?: Record<string, number>;
}

export interface DraftRowResult {
  resultId: string;
  driverNameRaw: string | null;
  match: MatchResult;
  issues: ValidationIssue[];
  lowConfidenceFields: string[];
}

/**
 * Shared by Path B/C/D (section 3: "Review screen — shared by all paths").
 * Creates the ingest batch, inserts every row as an unpublished draft
 * (publishedAt = null), runs fuzzy matching and validation on each, and
 * returns everything the review screen needs to render — nothing here is
 * visible to a public/ranked query until publishIngestBatch() runs.
 */
export async function createDraftBatch(params: {
  path: "photo" | "csv" | "manual";
  trackId: string;
  sessionId: string;
  className: string;
  provenanceDefault: "source_linked" | "self_reported" | "track_verified";
  rows: IncomingRow[];
  sourceMeta?: Record<string, unknown>;
}): Promise<{ batchId: string; rows: DraftRowResult[] }> {
  const [batch] = await db
    .insert(ingestBatches)
    .values({ path: params.path, trackId: params.trackId, status: "processing", sourceMeta: params.sourceMeta ?? {} })
    .returning();

  const trackRecordMs = await getTrackRecordMs(params.trackId, params.className);

  const inserted: { resultId: string; driverNameRaw: string | null; row: IncomingRow }[] = [];
  for (const row of params.rows) {
    const [result] = await db
      .insert(results)
      .values({
        sessionId: params.sessionId,
        racerId: null,
        driverNameRaw: row.driverName,
        kartNumber: row.kartNumber,
        position: row.position,
        laps: row.laps,
        bestLapMs: row.bestLapMs,
        totalTimeMs: row.totalTimeMs,
        gapMs: row.gapMs,
        status: row.status,
        provenance: params.provenanceDefault,
        ingestPath: params.path,
        extractionConfidence: row.confidence ?? {},
        ingestBatchId: batch.id,
        publishedAt: null,
      })
      .returning();
    inserted.push({ resultId: result.id, driverNameRaw: row.driverName, row });
  }

  const validationRows: DraftResultRow[] = inserted.map((r, i) => ({
    rowIndex: i,
    position: r.row.position,
    bestLapMs: r.row.bestLapMs,
    laps: r.row.laps,
  }));
  const issuesByIndex = validateSessionRows(validationRows, { trackRecordMs, expectedLapCount: null });

  const rows: DraftRowResult[] = [];
  for (let i = 0; i < inserted.length; i++) {
    const entry = inserted[i];
    const match = entry.driverNameRaw
      ? await matchRacer({
          trackId: params.trackId,
          driverName: entry.driverNameRaw,
          kartNumber: entry.row.kartNumber,
          className: params.className,
        })
      : { candidates: [], autoLink: null };

    rows.push({
      resultId: entry.resultId,
      driverNameRaw: entry.driverNameRaw,
      match,
      issues: issuesByIndex.get(i) ?? [],
      lowConfidenceFields: Object.entries(entry.row.confidence ?? {})
        .filter(([, score]) => score < 0.6)
        .map(([field]) => field),
    });
  }

  await db.update(ingestBatches).set({ status: "ready_for_review" }).where(eq(ingestBatches.id, batch.id));

  return { batchId: batch.id, rows };
}
