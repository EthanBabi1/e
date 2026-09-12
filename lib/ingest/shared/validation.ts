export interface ValidationIssue {
  field: string;
  message: string;
  severity: "warn" | "block";
}

export interface DraftResultRow {
  rowIndex: number;
  position: number | null;
  bestLapMs: number | null;
  laps: number | null;
}

// No grassroots kart class realistically laps a circuit in under 8 seconds.
// This is a hard physical-plausibility floor, independent of any specific
// track's record (section 3: "implausibly fast laps").
const ABSOLUTE_MIN_LAP_MS = 8000;

/**
 * Runs the review-screen validation checks from section 3 against a full
 * session's worth of parsed rows. Pure function — no DB access — so it's
 * cheap to unit test and safe to call from any ingest path.
 */
export function validateSessionRows(
  rows: DraftResultRow[],
  context: { trackRecordMs?: number | null; expectedLapCount?: number | null }
): Map<number, ValidationIssue[]> {
  const issues = new Map<number, ValidationIssue[]>();
  const addIssue = (rowIndex: number, issue: ValidationIssue) => {
    const list = issues.get(rowIndex) ?? [];
    list.push(issue);
    issues.set(rowIndex, list);
  };

  // Duplicate positions.
  const seenPositions = new Map<number, number[]>();
  for (const row of rows) {
    if (row.position == null) continue;
    const list = seenPositions.get(row.position) ?? [];
    list.push(row.rowIndex);
    seenPositions.set(row.position, list);
  }
  for (const [position, rowIndexes] of seenPositions) {
    if (rowIndexes.length > 1) {
      for (const rowIndex of rowIndexes) {
        addIssue(rowIndex, {
          field: "position",
          message: `Position ${position} is used by more than one row — check for a duplicate or a missed DNF/DQ.`,
          severity: "block",
        });
      }
    }
  }

  for (const row of rows) {
    if (row.bestLapMs != null) {
      if (row.bestLapMs < ABSOLUTE_MIN_LAP_MS) {
        addIssue(row.rowIndex, {
          field: "bestLapMs",
          message: "This lap time looks physically implausible for a kart. Double-check the source.",
          severity: "block",
        });
      } else if (context.trackRecordMs != null && row.bestLapMs < context.trackRecordMs) {
        addIssue(row.rowIndex, {
          field: "bestLapMs",
          message: "This would break the current track record for this class — confirm it's correct before publishing.",
          severity: "warn",
        });
      }
    }

    if (row.laps != null && context.expectedLapCount != null && row.laps > context.expectedLapCount) {
      addIssue(row.rowIndex, {
        field: "laps",
        message: `This row has ${row.laps} laps, more than the ${context.expectedLapCount} the race was scheduled for.`,
        severity: "warn",
      });
    }
  }

  return issues;
}

export function hasBlockingIssues(issues: Map<number, ValidationIssue[]>): boolean {
  for (const list of issues.values()) {
    if (list.some((i) => i.severity === "block")) return true;
  }
  return false;
}
