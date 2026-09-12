import { describe, expect, it } from "vitest";
import { parseResultsCsv } from "@/lib/ingest/csv/parse";
import { parseTimeToMs } from "@/lib/ingest/csv/timeParsing";
import { detectColumnMapping } from "@/lib/ingest/csv/columnMapping";

describe("time parsing — section 3's explicit mess cases", () => {
  it("parses minutes:seconds.fraction", () => {
    expect(parseTimeToMs("1:02.45")).toBe(62450);
  });
  it("parses bare seconds", () => {
    expect(parseTimeToMs("62.45")).toBe(62450);
  });
  it("parses European decimal commas", () => {
    expect(parseTimeToMs("51,234")).toBe(51234);
  });
  it("returns null for garbage", () => {
    expect(parseTimeToMs("DNF")).toBeNull();
    expect(parseTimeToMs("")).toBeNull();
    expect(parseTimeToMs(null)).toBeNull();
  });
});

describe("column mapping auto-detection", () => {
  it("detects a standard header row", () => {
    const mapping = detectColumnMapping(["Pos", "Kart", "Driver", "Class", "Laps", "Best Lap", "Total Time", "Gap"]);
    expect(mapping.position).toBe(0);
    expect(mapping.kartNumber).toBe(1);
    expect(mapping.driverName).toBe(2);
    expect(mapping.bestLapMs).toBe(5);
  });
});

describe("parseResultsCsv — messy real-world inputs (section 3)", () => {
  it("skips a junk title row above the real header, and a footer totals row", () => {
    const csv = [
      "Millhaven Kart Club - Round 3 Results",
      "Pos,Kart,Driver,Class,Laps,Best Lap,Total Time,Gap",
      "1,42,Avery Bell,Junior Sportsman,12,38.451,462.20,",
      "2,7,Owen Marsh,Junior Sportsman,12,38.902,464.85,2.65",
      "Total,,,,,,,,",
    ].join("\n");

    const result = parseResultsCsv(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].driverName).toBe("Avery Bell");
    expect(result.rows[0].bestLapMs).toBe(38451);
    expect(result.rows[1].gapMs).toBe(2650);
  });

  it("handles a BOM at the start of the file", () => {
    const csv = "﻿Pos,Kart,Driver,Class\n1,42,Avery Bell,Junior";
    const result = parseResultsCsv(csv);
    expect(result.rows[0].driverName).toBe("Avery Bell");
  });

  it("handles semicolon delimiters", () => {
    const csv = "Pos;Kart;Driver;Class\n1;42;Avery Bell;Junior";
    const result = parseResultsCsv(csv);
    expect(result.rows[0].driverName).toBe("Avery Bell");
    expect(result.rows[0].kartNumber).toBe("42");
  });

  it("marks DNF/DNS/DQ status from a status column", () => {
    const csv = ["Pos,Kart,Driver,Class,Status", "1,42,Avery Bell,Junior,", ",7,Owen Marsh,Junior,DNF"].join("\n");
    const result = parseResultsCsv(csv);
    expect(result.rows[0].status).toBe("finished");
    expect(result.rows[1].status).toBe("dnf");
  });

  it("reuses a remembered column mapping without re-detecting a header", () => {
    const csv = "1,42,Avery Bell,Junior";
    const result = parseResultsCsv(csv, { position: 0, kartNumber: 1, driverName: 2, className: 3 });
    expect(result.rows[0].driverName).toBe("Avery Bell");
  });
});
