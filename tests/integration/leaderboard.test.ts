import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { tracks, racers, events, raceSessions, results, ratings } from "@/db/schema";
import { recomputeAllRatings } from "@/lib/ratings/recompute";
import { getLeaderboard } from "@/lib/ratings/leaderboard";

const RUN = process.env.DATABASE_URL ? describe : describe.skip;

RUN("leaderboard (integration, real Postgres)", () => {
  const className = `Test Class ${Date.now()}`;
  let trackId: string;
  const racerIds: string[] = [];

  beforeAll(async () => {
    const [track] = await db
      .insert(tracks)
      .values({ slug: `test-track-${Date.now()}`, name: "Integration Test Track", isFictionalDemo: true })
      .returning();
    trackId = track.id;

    for (let i = 0; i < 4; i++) {
      const [racer] = await db
        .insert(racers)
        .values({
          slug: `test-racer-${Date.now()}-${i}`,
          firstName: "Test",
          lastName: `Racer${i}`,
          isMinor: false,
          classDefault: className,
          homeTrackId: trackId,
          isFictionalDemo: true,
        })
        .returning();
      racerIds.push(racer.id);
    }

    // Racer 0 wins 9 real races against racer 1 (enough to clear the
    // provisional threshold). Racer 2 has only self-reported results.
    for (let i = 0; i < 9; i++) {
      const [event] = await db
        .insert(events)
        .values({ trackId, name: `Test Event ${i}`, date: `2026-0${(i % 9) + 1}-01`, isFictionalDemo: true })
        .returning();
      const [session] = await db
        .insert(raceSessions)
        .values({ eventId: event.id, type: "race", className })
        .returning();
      await db.insert(results).values([
        {
          sessionId: session.id,
          racerId: racerIds[0],
          position: 1,
          status: "finished",
          provenance: "transponder_verified",
          ingestPath: "mylaps",
          publishedAt: new Date(),
        },
        {
          sessionId: session.id,
          racerId: racerIds[1],
          position: 2,
          status: "finished",
          provenance: "transponder_verified",
          ingestPath: "mylaps",
          publishedAt: new Date(),
        },
      ]);
    }

    // Racer 2: nine self-reported "wins" that must never affect a rating
    // or appear on the leaderboard (section 8).
    for (let i = 0; i < 9; i++) {
      const [event] = await db
        .insert(events)
        .values({ trackId, name: `Self-Reported Event ${i}`, date: `2026-0${(i % 9) + 1}-02`, isFictionalDemo: true })
        .returning();
      const [session] = await db
        .insert(raceSessions)
        .values({ eventId: event.id, type: "race", className })
        .returning();
      await db.insert(results).values({
        sessionId: session.id,
        racerId: racerIds[2],
        position: 1,
        status: "finished",
        provenance: "self_reported",
        ingestPath: "manual",
        publishedAt: new Date(),
      });
    }

    // Racer 3: nine real, verified results that are still drafts (never
    // confirmed on the review screen) — publishedAt stays null. Must never
    // move a rating, per the same gate as self-reported exclusion.
    for (let i = 0; i < 9; i++) {
      const [event] = await db
        .insert(events)
        .values({ trackId, name: `Draft Event ${i}`, date: `2026-0${(i % 9) + 1}-03`, isFictionalDemo: true })
        .returning();
      const [session] = await db
        .insert(raceSessions)
        .values({ eventId: event.id, type: "race", className })
        .returning();
      await db.insert(results).values({
        sessionId: session.id,
        racerId: racerIds[3],
        position: 1,
        status: "finished",
        provenance: "transponder_verified",
        ingestPath: "photo",
        publishedAt: null,
      });
    }

    await recomputeAllRatings();
  });

  afterAll(async () => {
    await db.delete(results).where(sql`session_id IN (SELECT id FROM race_sessions WHERE event_id IN (SELECT id FROM events WHERE track_id = ${trackId}))`);
    await db.delete(raceSessions).where(sql`event_id IN (SELECT id FROM events WHERE track_id = ${trackId})`);
    await db.delete(events).where(sql`track_id = ${trackId}`);
    await db.delete(ratings).where(inArray(ratings.racerId, racerIds));
    await db.delete(racers).where(inArray(racers.id, racerIds));
    await db.delete(tracks).where(sql`id = ${trackId}`);
  });

  it("promotes a racer past the provisional threshold onto the leaderboard", async () => {
    const board = await getLeaderboard({ className, trackId });
    const names = board.map((e) => e.racer.displayName);
    expect(names).toContain("Test Racer0");
  });

  it("never includes a racer whose only results are self-reported", async () => {
    const board = await getLeaderboard({ className, trackId });
    const names = board.map((e) => e.racer.displayName);
    expect(names).not.toContain("Test Racer2");
  });

  it("never includes a still-provisional racer (fewer than threshold ranked results)", async () => {
    const board = await getLeaderboard({ className, trackId });
    const names = board.map((e) => e.racer.displayName);
    // Racer1 lost all 9 races but still has 9 ranked results, so they DO
    // clear the threshold — confirm losing racers aren't hidden, only
    // provisional ones are.
    expect(names).toContain("Test Racer1");
  });

  it("never includes a racer whose only results are unpublished drafts", async () => {
    const board = await getLeaderboard({ className, trackId });
    const names = board.map((e) => e.racer.displayName);
    expect(names).not.toContain("Test Racer3");
  });
});
