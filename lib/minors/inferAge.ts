import { CONFIG } from "@/lib/config";

// Junior/cadet classes are minors by definition (brief section 3). Matched
// case-insensitively against a substring so "Junior Sportsman", "Cadet 1",
// "Mini Rok", "Kid Kart" etc. all match without an exhaustive enum that
// will inevitably miss a track's local class name.
const MINOR_CLASS_PATTERNS = [
  /junior/i,
  /cadet/i,
  /kid\s*kart/i,
  /mini\b/i,
  /micro/i,
  /bambino/i,
  /rookie/i,
  /youth/i,
];

export function classImpliesMinor(className: string | null | undefined): boolean {
  if (!className) return false;
  return MINOR_CLASS_PATTERNS.some((re) => re.test(className));
}

export function ageFromDob(dob: string | Date | null | undefined, asOf: Date = new Date()): number | null {
  if (!dob) return null;
  const d = typeof dob === "string" ? new Date(dob) : dob;
  let age = asOf.getFullYear() - d.getFullYear();
  const monthDiff = asOf.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < d.getDate())) {
    age--;
  }
  return age;
}

/**
 * The single decision point for "is this racer a minor." Rule (section 3):
 * age unknown → treat as minor until a claim proves otherwise. This is
 * deliberately conservative in one direction only — it can be wrong by
 * treating an adult as a minor (costs a little growth), never the other way.
 */
export function inferIsMinor(input: {
  dob?: string | Date | null;
  className?: string | null;
}): { isMinor: boolean; inferredFromClass: boolean } {
  const age = ageFromDob(input.dob);
  if (age !== null) {
    return { isMinor: age < CONFIG.minorAgeThreshold, inferredFromClass: false };
  }
  if (classImpliesMinor(input.className)) {
    return { isMinor: true, inferredFromClass: true };
  }
  // Unknown → minor, per the brief's explicit conservative default.
  return { isMinor: true, inferredFromClass: false };
}
