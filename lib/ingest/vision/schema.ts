import { z } from "zod";

// Confidence per field lets the review screen highlight amber cells (section 3).
export const ExtractedRowSchema = z.object({
  position: z.number().int().nullable(),
  kartNumber: z.string().nullable(),
  driverName: z.string().nullable(),
  class: z.string().nullable(),
  laps: z.number().int().nullable(),
  bestLap: z.string().nullable(), // raw string ("1:02.45" or "62.45") — parsed downstream by lib/ingest/csv/timeParsing
  totalTime: z.string().nullable(),
  gap: z.string().nullable(),
  status: z.enum(["finished", "dnf", "dns", "dq"]).default("finished"),
  confidence: z.record(z.string(), z.number().min(0).max(1)).default({}),
});

export const ExtractionResponseSchema = z.object({
  rows: z.array(ExtractedRowSchema),
  // The model's own note when something looked off (skew, glare, multiple
  // classes on one sheet, illegible cell) — surfaced to the reviewer.
  notes: z.array(z.string()).default([]),
});

export type ExtractedRow = z.infer<typeof ExtractedRowSchema>;
export type ExtractionResponse = z.infer<typeof ExtractionResponseSchema>;

const LOW_CONFIDENCE_THRESHOLD = 0.6;

export function lowConfidenceFields(row: ExtractedRow): string[] {
  return Object.entries(row.confidence)
    .filter(([, score]) => score < LOW_CONFIDENCE_THRESHOLD)
    .map(([field]) => field);
}
