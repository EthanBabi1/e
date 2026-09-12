/** Only these count toward anything ranked (section 8) — shared between the
 * rating recompute job and any other query that needs the same rule
 * (track records, standings). Self-reported never counts. */
export const RANKED_PROVENANCE = ["transponder_verified", "track_verified", "source_linked"] as const;
