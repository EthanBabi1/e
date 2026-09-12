/** Timeout, 5xx, rate limit — worth retrying (section 3: "when the sync fails"). */
export class TransientSyncError extends Error {}

/** Auth revoked, endpoint gone, transponder returns nothing meaningful — retrying won't help. */
export class PermanentSyncError extends Error {}
