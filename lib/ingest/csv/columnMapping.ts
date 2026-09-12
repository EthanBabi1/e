export type CanonicalField =
  | "position"
  | "kartNumber"
  | "driverName"
  | "className"
  | "laps"
  | "bestLapMs"
  | "totalTimeMs"
  | "gapMs"
  | "status";

const HEADER_PATTERNS: Record<CanonicalField, RegExp[]> = {
  position: [/^pos(ition)?$/, /^fin(ish)?$/, /^rank$/],
  kartNumber: [/^kart$/, /^car$/, /^no\.?$/, /^number$/, /^#$/],
  driverName: [/^name$/, /^driver$/, /^competitor$/, /^racer$/],
  className: [/^class$/, /^division$/, /^cat(egory)?$/, /^grp$/, /^group$/],
  laps: [/^laps?$/, /^lapscompleted$/, /^lapsrun$/],
  bestLapMs: [/^best$/, /^bestlap$/, /^fastest$/, /^fastestlap$/, /^blap$/],
  totalTimeMs: [/^total$/, /^totaltime$/, /^time$/, /^racetime$/],
  gapMs: [/^gap$/, /^diff(erence)?$/, /^interval$/, /^behind$/],
  status: [/^status$/, /^result$/],
};

function normalizeHeader(cell: string): string {
  return cell
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9#.]/g, "");
}

/** Auto-detects which CSV column maps to which canonical field (section 3, Path C). */
export function detectColumnMapping(headerRow: string[]): Partial<Record<CanonicalField, number>> {
  const mapping: Partial<Record<CanonicalField, number>> = {};
  headerRow.forEach((rawCell, index) => {
    const cell = normalizeHeader(rawCell);
    for (const [field, patterns] of Object.entries(HEADER_PATTERNS) as [CanonicalField, RegExp[]][]) {
      if (mapping[field] !== undefined) continue;
      if (patterns.some((re) => re.test(cell))) {
        mapping[field] = index;
      }
    }
  });
  return mapping;
}

/** A row is plausibly a header if it matches at least 2 canonical fields. */
export function looksLikeHeaderRow(row: string[]): boolean {
  return Object.keys(detectColumnMapping(row)).length >= 2;
}

/** A row is plausibly a footer/junk row (totals, blank trailing rows, etc). */
export function looksLikeJunkRow(row: string[], mapping: Partial<Record<CanonicalField, number>>): boolean {
  const nameIdx = mapping.driverName;
  const nameCell = nameIdx != null ? (row[nameIdx] ?? "").trim().toLowerCase() : "";
  if (/^total/i.test(nameCell) || nameCell === "") return true;
  const nonEmptyCells = row.filter((c) => c.trim() !== "").length;
  return nonEmptyCells === 0;
}
