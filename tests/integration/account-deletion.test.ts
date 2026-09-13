import { describe, expect, it, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  auditLog, claimInvitations, claims, events, guardianRacers, guardians, laps,
  messages, messageThreads, raceSessions, racers, results, tracks, users,
} from "@/db/schema";
import { isAccessible, requestDeletion, restoreAccount } from "@/lib/accounts/deletion";

const RUN = process.env.DATABASE_URL ? describe : describe.skip;

// DEFINITION OF DONE: "A deletion request from a guardian purges
// immediately and completely, verified by test."
RUN("account deletion (section 3, DoD)", () => {
  const cleanupRacerIds: string[] = [];
  const cleanupUserIds: string[] = [];
  const cleanupTrackIds: string[] = [];

  afterAll(async () => {
    for (const racerId of cleanupRacerIds) {
      await db.delete(guardianRacers).where(eq(guardianRacers.racerId, racerId));
      await db.delete(claims).where(eq(claims.racerId, racerId));
      await db.delete(claimInvitations).where(eq(claimInvitations.racerId, racerId));
      const threads = await db.select().from(messageThreads).where(eq(messageThreads.racerId, racerId));
      for (const t of threads) await db.delete(messages).where(eq(messages.threadId, t.id));
      await db.delete(messageThreads).where(eq(messageThreads.racerId, racerId));
      const racerResults = await db.select().from(results).where(eq(results.racerId, racerId));
      for (const r of racerResults) await db.delete(laps).where(eq(laps.resultId, r.id));
      await db.delete(results).where(eq(results.racerId, racerId));
      await db.delete(racers).where(eq(racers.id, racerId));
    }
    for (const trackId of cleanupTrackIds) {
      const trackEvents = await db.select().from(events).where(eq(events.trackId, trackId));
      for (const e of trackEvents) {
        const sessions = await db.select().from(raceSessions).where(eq(raceSessions.eventId, e.id));
        for (const s of sessions) await db.delete(raceSessions).where(eq(raceSessions.id, s.id));
      }
      await db.delete(events).where(eq(events.trackId, trackId));
      await db.delete(tracks).where(eq(tracks.id, trackId));
    }
    for (const userId of cleanupUserIds) {
      await db.delete(auditLog).where(eq(auditLog.actorUserId, userId));
      await db.delete(guardians).where(eq(guardians.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  async function setupMinorWithFullHistory() {
    const suffix = Date.now() + Math.random();
    const [guardianUser] = await db.insert(users).values({ email: `deletion-guardian-${suffix}@seed.example`, role: "guardian" }).returning();
    const [sponsorUser] = await db.insert(users).values({ email: `deletion-sponsor-${suffix}@seed.example`, role: "sponsor" }).returning();
    const [track] = await db.insert(tracks).values({ slug: `deletion-track-${suffix}`, name: "Deletion Test Track", isFictionalDemo: true }).returning();
    const [racer] = await db
      .insert(racers)
      .values({
        slug: `deletion-minor-${suffix}`,
        firstName: "Test",
        lastName: "Minor",
        isMinor: true,
        bio: "A bio that must not survive",
        story: "A story that must not survive",
        photoUrl: "https://example.com/photo.jpg",
        homeTrackId: track.id,
        isFictionalDemo: true,
      })
      .returning();
    const [guardian] = await db.insert(guardians).values({ userId: guardianUser.id }).returning();
    await db.insert(guardianRacers).values({ guardianId: guardian.id, racerId: racer.id });
    await db.insert(claims).values({ racerId: racer.id, claimedByUserId: guardianUser.id, verifiedVia: "guardian_verification", isGuardianClaim: true });
    await db.insert(claimInvitations).values({ racerId: racer.id, token: `token-${suffix}` });

    const [event] = await db.insert(events).values({ trackId: track.id, name: "Deletion Test Event", date: "2026-01-01", isFictionalDemo: true }).returning();
    const [session] = await db.insert(raceSessions).values({ eventId: event.id, type: "race", className: "Cadet" }).returning();
    const [result] = await db
      .insert(results)
      .values({ sessionId: session.id, racerId: racer.id, position: 1, status: "finished", provenance: "transponder_verified", ingestPath: "mylaps", publishedAt: new Date() })
      .returning();
    await db.insert(laps).values({ resultId: result.id, lapNumber: 1, lapTimeMs: 45000 });

    const [thread] = await db.insert(messageThreads).values({ racerId: racer.id, sponsorUserId: sponsorUser.id, guardianUserId: guardianUser.id }).returning();
    await db.insert(messages).values({ threadId: thread.id, senderUserId: sponsorUser.id, body: "Interested in sponsoring!" });

    cleanupRacerIds.push(racer.id);
    cleanupTrackIds.push(track.id);
    cleanupUserIds.push(guardianUser.id, sponsorUser.id);

    return { guardianUser, sponsorUser, racer, thread, result };
  }

  it("purges a minor's results, laps, messages, claims and profile PII immediately when a guardian requests it", async () => {
    const { guardianUser, racer, thread, result } = await setupMinorWithFullHistory();

    const outcome = await requestDeletion({ racerId: racer.id, requestedByUserId: guardianUser.id, isGuardianOfMinor: true });
    expect(outcome.immediate).toBe(true);

    const [afterResult] = await db.select().from(results).where(eq(results.id, result.id));
    expect(afterResult).toBeUndefined();

    const remainingLaps = await db.select().from(laps).where(eq(laps.resultId, result.id));
    expect(remainingLaps).toHaveLength(0);

    const [afterThread] = await db.select().from(messageThreads).where(eq(messageThreads.id, thread.id));
    expect(afterThread).toBeUndefined();

    const remainingMessages = await db.select().from(messages).where(eq(messages.threadId, thread.id));
    expect(remainingMessages).toHaveLength(0);

    const remainingClaims = await db.select().from(claims).where(eq(claims.racerId, racer.id));
    expect(remainingClaims).toHaveLength(0);

    const remainingInvitations = await db.select().from(claimInvitations).where(eq(claimInvitations.racerId, racer.id));
    expect(remainingInvitations).toHaveLength(0);

    const remainingGuardianLinks = await db.select().from(guardianRacers).where(eq(guardianRacers.racerId, racer.id));
    expect(remainingGuardianLinks).toHaveLength(0);

    const [afterRacer] = await db.select().from(racers).where(eq(racers.id, racer.id));
    expect(afterRacer.firstName).toBe("Deleted");
    expect(afterRacer.lastName).toBe("Racer");
    expect(afterRacer.bio).toBeNull();
    expect(afterRacer.story).toBeNull();
    expect(afterRacer.photoUrl).toBeNull();
    expect(afterRacer.slug).not.toBe(racer.slug);
    expect(afterRacer.deletedAt).not.toBeNull();
    expect(isAccessible(afterRacer)).toBe(false);
  });

  it("puts an adult's own deletion request into a 90-day restorable hold instead of purging immediately", async () => {
    const suffix = Date.now() + Math.random();
    const [racerUser] = await db.insert(users).values({ email: `deletion-adult-${suffix}@seed.example`, role: "racer" }).returning();
    const [racer] = await db
      .insert(racers)
      .values({ slug: `deletion-adult-${suffix}`, firstName: "Adult", lastName: "Racer", isMinor: false, userId: racerUser.id, bio: "Still here", isFictionalDemo: true })
      .returning();
    cleanupRacerIds.push(racer.id);
    cleanupUserIds.push(racerUser.id);

    const outcome = await requestDeletion({ racerId: racer.id, requestedByUserId: racerUser.id, isGuardianOfMinor: false });
    expect(outcome.immediate).toBe(false);

    const [held] = await db.select().from(racers).where(eq(racers.id, racer.id));
    expect(held.deletionRequestedAt).not.toBeNull();
    expect(held.deletedAt).toBeNull();
    expect(held.bio).toBe("Still here"); // not purged yet — only suspended
    expect(isAccessible(held)).toBe(false); // hidden during the hold, though

    await restoreAccount(racer.id);
    const [restored] = await db.select().from(racers).where(eq(racers.id, racer.id));
    expect(restored.deletionRequestedAt).toBeNull();
    expect(isAccessible(restored)).toBe(true);
  });
});
