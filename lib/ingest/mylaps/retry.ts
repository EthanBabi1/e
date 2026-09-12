import { PermanentSyncError } from "./errors";

/**
 * Exponential backoff that distinguishes transient failures (retried) from
 * permanent ones (fail fast) — section 3: "Retry with exponential backoff.
 * Distinguish a transient failure... from a permanent one." `sleepFn` is
 * injectable so tests don't spend real wall-clock time on backoff delays.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; baseDelayMs?: number; sleepFn?: (ms: number) => Promise<void> } = {}
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const sleep = opts.sleepFn ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (err instanceof PermanentSyncError) {
        throw err; // no point retrying
      }
      if (attempt < maxAttempts) {
        await sleep(baseDelayMs * 2 ** (attempt - 1));
      }
    }
  }
  throw lastError;
}
