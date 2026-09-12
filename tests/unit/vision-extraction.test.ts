import { describe, expect, it, beforeEach, afterAll } from "vitest";
import { lowConfidenceFields, ExtractedRowSchema } from "@/lib/ingest/vision/schema";
import { extractResultsFromImage, ExtractionUnavailableError } from "@/lib/ingest/vision/extract";

describe("vision extraction schema", () => {
  it("flags low-confidence fields for amber-highlighting on the review screen", () => {
    const row = ExtractedRowSchema.parse({
      position: 1,
      kartNumber: "42",
      driverName: "Avery Bell",
      class: "Junior",
      laps: 12,
      bestLap: "38.45",
      totalTime: "462.2",
      gap: null,
      status: "finished",
      confidence: { position: 0.95, kartNumber: 0.3, driverName: 0.9 },
    });
    expect(lowConfidenceFields(row)).toEqual(["kartNumber"]);
  });

  it("defaults status to finished and confidence to empty when omitted", () => {
    const row = ExtractedRowSchema.parse({
      position: 1,
      kartNumber: "42",
      driverName: "Avery Bell",
      class: null,
      laps: null,
      bestLap: null,
      totalTime: null,
      gap: null,
    });
    expect(row.status).toBe("finished");
    expect(lowConfidenceFields(row)).toEqual([]);
  });
});

describe("extraction availability (section: missing credentials → stub, never block the build)", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });
  afterAll(() => {
    if (originalKey) process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it("throws a specific, catchable error (not a generic crash) when no API key is configured", async () => {
    await expect(
      extractResultsFromImage({ imageBase64: ["abc"], mediaType: "image/jpeg" })
    ).rejects.toBeInstanceOf(ExtractionUnavailableError);
  });
});
