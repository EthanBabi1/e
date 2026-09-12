import { describe, expect, it } from "vitest";
import { withRetry } from "@/lib/ingest/mylaps/retry";
import { PermanentSyncError, TransientSyncError } from "@/lib/ingest/mylaps/errors";
import { shouldNotifyStaleSync, isPlatformWideFailure } from "@/lib/ingest/mylaps/sync";

const noopSleep = () => Promise.resolve();

describe("withRetry — section 3 sync-failure handling", () => {
  it("retries a transient error and succeeds on a later attempt", async () => {
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts++;
        if (attempts < 3) throw new TransientSyncError("timeout");
        return "ok";
      },
      { maxAttempts: 5, sleepFn: noopSleep }
    );
    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("does not retry a permanent error", async () => {
    let attempts = 0;
    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new PermanentSyncError("auth revoked");
        },
        { maxAttempts: 5, sleepFn: noopSleep }
      )
    ).rejects.toBeInstanceOf(PermanentSyncError);
    expect(attempts).toBe(1);
  });

  it("gives up after maxAttempts on a persistently transient error", async () => {
    let attempts = 0;
    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new TransientSyncError("still down");
        },
        { maxAttempts: 3, sleepFn: noopSleep }
      )
    ).rejects.toBeInstanceOf(TransientSyncError);
    expect(attempts).toBe(3);
  });

  it("backs off exponentially between attempts", async () => {
    const delays: number[] = [];
    let attempts = 0;
    await withRetry(
      async () => {
        attempts++;
        if (attempts < 3) throw new TransientSyncError("timeout");
        return "ok";
      },
      { maxAttempts: 5, baseDelayMs: 100, sleepFn: async (ms) => void delays.push(ms) }
    );
    expect(delays).toEqual([100, 200]);
  });
});

describe("stale sync notification (section 3: email after 7 days)", () => {
  it("does not notify before 7 days of failure", () => {
    const now = new Date("2026-01-10");
    const lastSuccessAt = new Date("2026-01-05"); // 5 days ago
    expect(shouldNotifyStaleSync({ lastSuccessAt, staleNoticeEmailSentAt: null }, now)).toBe(false);
  });

  it("notifies after 7 days without a successful sync", () => {
    const now = new Date("2026-01-13");
    const lastSuccessAt = new Date("2026-01-01"); // 12 days ago
    expect(shouldNotifyStaleSync({ lastSuccessAt, staleNoticeEmailSentAt: null }, now)).toBe(true);
  });

  it("never having succeeded at all still triggers the notice after 7 days", () => {
    const now = new Date("2026-01-13");
    expect(shouldNotifyStaleSync({ lastSuccessAt: null, staleNoticeEmailSentAt: null }, now)).toBe(true);
  });

  it("does not re-notify once already sent", () => {
    const now = new Date("2026-01-13");
    expect(
      shouldNotifyStaleSync({ lastSuccessAt: new Date("2026-01-01"), staleNoticeEmailSentAt: new Date("2026-01-09") }, now)
    ).toBe(false);
  });
});

describe("platform-wide failure detection (section 3: admin alert within the hour)", () => {
  it("does not fire on too little data", () => {
    expect(isPlatformWideFailure([{ succeeded: false }, { succeeded: false }])).toBe(false);
  });

  it("fires when most recent attempts across racers all failed", () => {
    const attempts = Array.from({ length: 10 }, (_, i) => ({ succeeded: i === 0 }));
    expect(isPlatformWideFailure(attempts)).toBe(true);
  });

  it("does not fire when failures are isolated to a few racers", () => {
    const attempts = Array.from({ length: 10 }, (_, i) => ({ succeeded: i > 1 }));
    expect(isPlatformWideFailure(attempts)).toBe(false);
  });
});
