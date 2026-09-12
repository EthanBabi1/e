import Papa from "papaparse";
import { detectColumnMapping, looksLikeHeaderRow, looksLikeJunkRow, type CanonicalField } from "./columnMapping";
import { parseIntOrNull, parseTimeToMs } from "./timeParsing";

export interface ParsedCsvRow {
  rowIndex: number;
  position: number | null;
  kartNumber: string | null;
  driverName: string | null;
  className: string | null;
  laps: number | null;
  bestLapMs: number | null;
  totalTimeMs: number | null;
  gapMs: number | null;
  status: "finished" | "dnf" | "dns" | "dq";
}

export interface ParseCsvResult {
  columnMapping: Partial<Record<CanonicalField, number>>;
  rows: ParsedCsvRow[];
  headerRowIndex: number;
}

function parseStatus(raw: string | undefined): ParsedCsvRow["status"] {
  const cell = (raw ?? "").trim().toLowerCase();
  if (cell.includes("dnf")) return "dnf";
  if (cell.includes("dns")) return "dns";
  if (cell.includes("dq")) return "dq";
  return "finished";
}

/**
 * Handles the real mess section 3 names explicitly: junk header rows,
 * footer totals, merged-cell blanks, BOM, semicolon delimiters, comma
 * decimals (delegated to timeParsing). `overrideMapping` lets the caller
 * skip auto-detection entirely using a track's remembered mapping from a
 * prior upload (Path C: "remember it per track so the second upload is
 * zero-config").
 */
export function parseResultsCsv(
  rawText: string,
  overrideMapping?: Partial<Record<CanonicalField, number>>
): ParseCsvResult {
  const text = rawText.replace(/^﻿/, ""); // strip BOM
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const allRows = parsed.data as string[][];

  let headerRowIndex = -1;
  let columnMapping = overrideMapping;

  // Scan for a header-like row regardless of whether we have a remembered
  // mapping — we still need to know where the data starts (skip a title
  // row above it, or a header row itself if this file still has one).
  for (let i = 0; i < Math.min(allRows.length, 5); i++) {
    if (looksLikeHeaderRow(allRows[i])) {
      headerRowIndex = i;
      if (!columnMapping) columnMapping = detectColumnMapping(allRows[i]);
      break;
    }
  }

  if (!columnMapping) {
    columnMapping = {};
  }

  const dataRows = allRows.slice(headerRowIndex + 1);
  const rows: ParsedCsvRow[] = [];

  dataRows.forEach((row, idx) => {
    if (looksLikeJunkRow(row, columnMapping!)) return;
    const cell = (field: CanonicalField) => {
      const i = columnMapping![field];
      return i != null ? row[i] : undefined;
    };

    rows.push({
      rowIndex: idx,
      position: parseIntOrNull(cell("position")),
      kartNumber: cell("kartNumber")?.trim() || null,
      driverName: cell("driverName")?.trim() || null,
      className: cell("className")?.trim() || null,
      laps: parseIntOrNull(cell("laps")),
      bestLapMs: parseTimeToMs(cell("bestLapMs")),
      totalTimeMs: parseTimeToMs(cell("totalTimeMs")),
      gapMs: parseTimeToMs(cell("gapMs")),
      status: parseStatus(cell("status")),
    });
  });

  return { columnMapping, rows, headerRowIndex };
}
