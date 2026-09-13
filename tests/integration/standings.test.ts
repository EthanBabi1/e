import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { events, raceSessions, racers, results, series, seriesRounds, tracks } from "@/db/schema";
import { computeStandings } from "@/lib/tracks/standings";

const RUN = process.env.DATABASE_URL ? describe : describe.skip;

RUN("championship standings (section 5)", () => {
  const className = `Standings Test ${Date.now()}`;
  let trackId: string;
  let seriesId: string;
  let racerAId: string;
  let racerBId: string;
  const eventIds: string[] = [];

  beforeAll(async () => {
    const [track] = await db.insert(tracks).values({ slug: `standings-track-${Date.now()}`, name: "Standings Test Track", isFictionalDemo: true }).returning();
    trackId = track.id;

    const [seriesRow] = await db
      .insert(series)
      .values({ trackId, name: "Test Series", seasonYear: 2026, classes: [className], dropScores: 1 })
      .returning();
    seriesId = seriesRow.id;

    const [racerA] = await db.insert(racers).values({ slug: `standings-a-${Date.now()}`, firstName: "Racer", lastName: "A", isMinor: false, isFictionalDemo: true }).returning();
    const [racerB] = await db.insert(racers).values({ slug: `standings-b-${Date.now()}`, firstName: "Racer", lastName: "B", isMinor: false, isFictionalDemo: true }).returning();
    racerAId = racerA.id;
    racerBId = racerB.id;

    // 3 rounds. Racer A: 25, 5, 20 (drop the 5 -> 45). Racer B: 18, 18, 18 (drop one 18 -> 36).
    const roundPoints = [
      [25, 18],
      [5, 18],
      [20, 18],
    ];

    for (let i = 0; i < 3; i++) {
      const [event] = await db.insert(events).values({ trackId, name: `Round ${i + 1}`, date: `2026-0${i + 1}-01`, isFictionalDemo: true }).returning();
      eventIds.push(event.id);
      await db.insert(seriesRounds).values({ seriesId, eventId: event.id, roundNumber: i + 1 });
      const [session] = await db.insert(raceSessions).values({ eventId: event.id, type: "race", className }).returning();
      await db.insert(results).values([
        { sessionId: session.id, racerId: racerAId, position: 1, status: "finished", points: roundPoints[i][0], provenance: "transponder_verified", ingestPath: "mylaps", publishedAt: new Date() },
        { sessionId: session.id, racerId: racerBId, position: 2, status: "finished", points: roundPoints[i][1], provenance: "transponder_verified", ingestPath: "mylaps", publishedAt: new Date() },
      ]);
    }
  });

  afterAll(async () => {
    await db.delete(series).where(eq(series.id, seriesId)); // cascades series_rounds
    await db.delete(events).where(eq(events.trackId, trackId)); // cascades race_sessions/results
    await db.delete(tracks).where(eq(tracks.id, trackId));
    await db.delete(racers).where(eq(racers.id, racerAId));
    await db.delete(racers).where(eq(racers.id, racerBId));
  });

  it("drops the lowest round and sums the rest correctly", async () => {
    const standings = await computeStandings(seriesId, className);
    const a = standings.find((s) => s.racer.id === racerAId)!;
    const b = standings.find((s) => s.racer.id === racerBId)!;

    expect(a.totalPoints).toBe(45); // 25 + 20, dropped the 5
    expect(b.totalPoints).toBe(36); // 18 + 18, dropped one 18
  });

  it("ranks the standings by total points descending", async () => {
    const standings = await computeStandings(seriesId, className);
    expect(standings[0].racer.id).toBe(racerAId);
    expect(standings[1].racer.id).toBe(racerBId);
  });
});
