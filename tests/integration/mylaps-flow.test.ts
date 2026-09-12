import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { racers, results, mylapsSyncStatus, tracks } from "@/db/schema";

const FIXTURE_TRACK_NAME = "MYLAPS Fixture Track (demo)";

const RUN = process.env.DATABASE_URL ? describe : describe.skip;

RUN("MYLAPS import (Path A) — flagged, integration", () => {
  let racerId: string;

  beforeAll(async () => {
    const [racer] = await db
      .insert(racers)
      .values({
        slug: `mylaps-test-racer-${Date.now()}`,
        firstName: "Test",
        lastName: "Transponder",
        isMinor: false,
        isFictionalDemo: true,
      })
      .returning();
    racerId = racer.id;
  });

  afterAll(async () => {
    await db.delete(mylapsSyncStatus).where(eq(mylapsSyncStatus.racerId, racerId));
    await db.delete(results).where(eq(results.racerId, racerId));
    await db.delete(racers).where(eq(racers.id, racerId));
    // Deleting the fixture track cascades its events/sessions/results too
    // (see db/schema onDelete: "cascade" chains) — this is a track created
    // fresh by findOrCreateTrack() for this test run, never the real seeded
    // Millhaven/Cedar Ridge tracks, which use different names.
    await db.delete(tracks).where(eq(tracks.name, FIXTURE_TRACK_NAME));
  });

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("refuses to run while FEATURE_MYLAPS_IMPORT is off (the current default — see DATA-ACCESS.md)", async () => {
    vi.stubEnv("FEATURE_MYLAPS_IMPORT", "false");
    const { pullMylapsResultsForConfirmation, MylapsImportDisabledError } = await import("@/lib/ingest/mylaps/sync");
    await expect(pullMylapsResultsForConfirmation(racerId, "TX-1")).rejects.toBeInstanceOf(MylapsImportDisabledError);
  });

  it("when enabled: pulls a confirmation list, imports on confirm, and records sync success", async () => {
    vi.stubEnv("FEATURE_MYLAPS_IMPORT", "true");
    const { pullMylapsResultsForConfirmation } = await import("@/lib/ingest/mylaps/sync");
    const { confirmAndImportMylapsSessions } = await import("@/lib/ingest/mylaps/confirm");

    const pulled = await pullMylapsResultsForConfirmation(racerId, "TX-DEMO-1");
    expect(pulled.totalSessions).toBeGreaterThan(0);

    const allSessions = pulled.groups.flatMap((g) => g.sessions);
    const imported = await confirmAndImportMylapsSessions(racerId, allSessions);
    expect(imported.imported).toBe(allSessions.length);

    const [status] = await db.select().from(mylapsSyncStatus).where(eq(mylapsSyncStatus.racerId, racerId));
    expect(status.lastSuccessAt).not.toBeNull();
    expect(status.consecutiveFailures).toBe(0);

    // Idempotent re-sync: importing the exact same sessions again inserts nothing new.
    const reimport = await confirmAndImportMylapsSessions(racerId, allSessions);
    expect(reimport.imported).toBe(0);
    expect(reimport.skippedDuplicates).toBe(allSessions.length);
  });

  it("when enabled: a permanent failure is recorded without corrupting prior data", async () => {
    vi.stubEnv("FEATURE_MYLAPS_IMPORT", "true");
    const { pullMylapsResultsForConfirmation } = await import("@/lib/ingest/mylaps/sync");
    await expect(pullMylapsResultsForConfirmation(racerId, "FAIL-PERMANENT")).rejects.toThrow();

    const [status] = await db.select().from(mylapsSyncStatus).where(eq(mylapsSyncStatus.racerId, racerId));
    expect(status.lastErrorMessage).toBeTruthy();
    // The prior successful sync's timestamp must still stand — "a sync
    // that returns nothing is treated as a failed sync," never as a reason
    // to blank existing data.
    expect(status.lastSuccessAt).not.toBeNull();
  });
});
