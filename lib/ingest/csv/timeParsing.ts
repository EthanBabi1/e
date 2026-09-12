/**
 * Handles the real-world mess section 3 calls out: "1:02.45" and "62.45"
 * both meaning the same lap time, and European decimal commas. Returns
 * milliseconds, or null if the string isn't a recognizable time/number.
 */
export function parseTimeToMs(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  let str = String(raw).trim();
  if (!str) return null;

  // European decimal comma: a single comma followed by 1-3 digits and
  // nothing else after it is almost certainly a decimal separator, not a
  // thousands separator (lap times never run into the thousands).
  if (/^\d+,\d{1,3}$/.test(str)) {
    str = str.replace(",", ".");
  }

  const minutesFormat = str.match(/^(\d+):(\d{1,2})(?:\.(\d+))?$/);
  if (minutesFormat) {
    const minutes = Number(minutesFormat[1]);
    const seconds = Number(minutesFormat[2]);
    const fraction = minutesFormat[3] ? Number(`0.${minutesFormat[3]}`) : 0;
    return Math.round((minutes * 60 + seconds + fraction) * 1000);
  }

  const plainSeconds = Number(str);
  if (!Number.isNaN(plainSeconds) && plainSeconds > 0) {
    // Heuristic: a bare number under 1000 is seconds (e.g. "51.234"); a
    // number this large is already milliseconds (some exports do this).
    return plainSeconds < 1000 ? Math.round(plainSeconds * 1000) : Math.round(plainSeconds);
  }

  return null;
}

export function parseIntOrNull(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const n = parseInt(String(raw).trim(), 10);
  return Number.isNaN(n) ? null : n;
}
