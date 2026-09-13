import { db } from "@/db/client";
import {
  users, guardians, guardianRacers, tracks, racers, transponders,
  transponderAssignments, events, raceSessions, results, laps, series, claims,
  zones, zoneListings, policyVersions,
} from "@/db/schema";
import { POLICIES, MINOR_DISPLAY_CONSENT } from "@/lib/legal/policyContent";
import { CLASSES, FIRST_NAMES, LAST_NAMES } from "./data";
import { mulberry32, pick, randInt } from "./rng";
import { inferIsMinor } from "@/lib/minors";
import { recomputeAllRatings } from "@/lib/ratings/recompute";
import { sql } from "drizzle-orm";
import { CONFIG } from "@/lib/config";

const rng = mulberry32(42);

const POINTS = [25, 22, 20, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
function pointsForPosition(position: number | null): number | null {
  if (position == null) return null;
  return POINTS[position - 1] ?? 0;
}

function generateLaps(numLaps: number, baseMs: number, skillMs: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < numLaps; i++) {
    let lap = baseMs + skillMs + Math.round((rng() - 0.5) * 900);
    if (rng() < 0.08) lap += randInt(rng, 1200, 4000); // traffic/mistake lap
    out.push(Math.max(baseMs - 3000, lap));
  }
  return out;
}

const DEMO_CLASS = "Senior Sportsman";
const DEMO_BASE_LAP_MS = 34000;

/**
 * Section 1: "Ship a /demo route with one fully populated fictional
 * racer, for showing tracks and sponsors what a finished profile looks
 * like before any real one exists." This racer gets enough race results
 * to clear the rating-provisional threshold (section 8) deliberately —
 * the point is to show the settled, full-density version of a profile,
 * which the rest of the season's realistic sparse data intentionally
 * doesn't produce on its own (see DECISIONS.md).
 */
async function createDemoRacer(track: typeof tracks.$inferSelect) {
  const [demoUser] = await db
    .insert(users)
    .values({ name: "Jordan Vance (fictional demo)", email: "demo.jordan.vance@seed.example", role: "racer" })
    .returning();

  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - 24);

  const [demoRacer] = await db
    .insert(racers)
    .values({
      slug: "demo-jordan-vance",
      userId: demoUser.id,
      firstName: "Jordan",
      lastName: "Vance",
      dob: dob.toISOString().slice(0, 10),
      isMinor: false,
      numberDefault: "17",
      classDefault: DEMO_CLASS,
      homeTrackId: track.id,
      town: "Millhaven",
      bio: "Fictional demo profile. Racing out of Millhaven for six seasons, currently chasing the regional Senior Sportsman title.",
      story:
        "This is a fictional demo profile built to show what a finished Podium Row page looks like. \"I started karting because my dad raced here in the 90s — now I'm trying to get my own name on that wall of track records.\"",
      socialFollowingSelfReported: 1840,
      trackdayAttendanceSelfReported: 22,
      claimStatus: "claimed",
      isFictionalDemo: true,
    })
    .returning();

  await db.insert(claims).values({ racerId: demoRacer.id, claimedByUserId: demoUser.id, verifiedVia: "email", isGuardianClaim: false });

  const [transponder] = await db.insert(transponders).values({ number: "TX-DEMO-17" }).returning();
  await db.insert(transponderAssignments).values({ transponderId: transponder.id, racerId: demoRacer.id, startDate: "2021-01-01" });

  // Three rivals guaranteed to race alongside the demo racer every round —
  // real seeded racers' attendance is randomized, which would make this
  // showcase profile's race count non-deterministic.
  const rivalNames = [["Priya", "Nakamura"], ["Diego", "Alderman"], ["Sloane", "Osei"]];
  const rivals: (typeof racers.$inferSelect)[] = [];
  for (const [firstName, lastName] of rivalNames) {
    const [rival] = await db
      .insert(racers)
      .values({
        slug: `demo-rival-${firstName.toLowerCase()}`,
        firstName,
        lastName,
        isMinor: false,
        classDefault: DEMO_CLASS,
        homeTrackId: track.id,
        isFictionalDemo: true,
      })
      .returning();
    rivals.push(rival);
  }

  const demoEventDates = ["2026-02-01", "2026-02-22", "2026-03-15", "2026-04-05", "2026-04-26", "2026-05-17", "2026-06-07", "2026-06-28", "2026-07-19", "2026-08-16"];

  for (let round = 0; round < demoEventDates.length; round++) {
    const [event] = await db
      .insert(events)
      .values({ trackId: track.id, name: `${track.name.split(" (")[0]} Round`, date: demoEventDates[round], isFictionalDemo: true })
      .returning();

    const [raceSession] = await db
      .insert(raceSessions)
      .values({ eventId: event.id, type: "race", className: DEMO_CLASS })
      .returning();

    // Demo racer wins most rounds, podiums the rest — a strong, consistent
    // season (this is the "full" density showcase, not the realistic one).
    const demoWins = round < 7;
    const entrants = [
      { racer: demoRacer, skillMs: -900, position: demoWins ? 1 : 2 },
      { racer: rivals[0], skillMs: -200, position: demoWins ? 2 : 1 },
      { racer: rivals[1], skillMs: 300, position: 3 },
      { racer: rivals[2], skillMs: 700, position: 4 },
    ];

    for (const entrant of entrants) {
      const lapTimes = generateLaps(12, DEMO_BASE_LAP_MS, entrant.skillMs);
      const totalTimeMs = lapTimes.reduce((a, b) => a + b, 0);
      const [result] = await db
        .insert(results)
        .values({
          sessionId: raceSession.id,
          racerId: entrant.racer.id,
          kartNumber: entrant.racer.numberDefault,
          position: entrant.position,
          laps: lapTimes.length,
          bestLapMs: Math.min(...lapTimes),
          totalTimeMs,
          status: "finished",
          points: pointsForPosition(entrant.position),
          provenance: "transponder_verified",
          ingestPath: "mylaps",
          sourceRef: { demoFixture: true, showcase: "demo-jordan-vance" },
          publishedAt: new Date(),
        })
        .returning();
      await db.insert(laps).values(lapTimes.map((lapTimeMs, idx) => ({ resultId: result.id, lapNumber: idx + 1, lapTimeMs })));
    }
  }

  return demoRacer;
}

const ZONE_TEMPLATE: { name: string; tier: "premium" | "mid" | "entry" }[] = [
  { name: "Nose Cone", tier: "premium" },
  { name: "Helmet Top", tier: "premium" },
  { name: "Suit Chest", tier: "premium" },
  { name: "Front Bumper", tier: "mid" },
  { name: "Side Pod Left", tier: "mid" },
  { name: "Side Pod Right", tier: "mid" },
  { name: "Suit Back", tier: "mid" },
  { name: "Rear Bumper", tier: "entry" },
  { name: "Rear Fender Left", tier: "entry" },
  { name: "Rear Fender Right", tier: "entry" },
];

const TIER_PRICE: Record<string, number> = { premium: 220, mid: 130, entry: 60 };

/** Seeds the 10-zone template for a racer, with a handful of them actively
 * listed — section 4's zone system, display-only in Phase 3 (checkout/
 * bidding logic lands in Phase 5). */
async function seedZonesForRacer(racerId: string, listedCount: number) {
  for (let i = 0; i < ZONE_TEMPLATE.length; i++) {
    const template = ZONE_TEMPLATE[i];
    const [zone] = await db
      .insert(zones)
      .values({ racerId, name: template.name, tier: template.tier, sortOrder: i })
      .returning();

    if (i < listedCount) {
      await db.insert(zoneListings).values({
        zoneId: zone.id,
        listingType: "buy_now",
        term: "season",
        priceUsd: TIER_PRICE[template.tier],
        isActive: true,
        guardianApprovedAt: new Date(), // adults only seeded this way — no guardian gate needed
      });
    }
  }
}

async function clearAll() {
  // Delete in FK-safe order. Fine for a dev-only reset script.
  await db.execute(sql`
    TRUNCATE TABLE
      rating_history, ratings,
      laps, results, race_sessions, series_rounds, series, events,
      claims, claim_invitations, takedown_requests,
      transponder_assignments, transponders,
      guardian_racers, guardians,
      messages, message_threads, thread_reports, user_blocks,
      notifications, notification_preferences,
      policy_acceptances, policy_versions,
      audit_log, logo_reports,
      analytics_events,
      racers, track_staff, tracks,
      sessions, accounts, verification_tokens, users
    RESTART IDENTITY CASCADE
  `);
}

export async function runSeed() {
  console.log("Clearing existing data...");
  await clearAll();

  console.log("Seeding the platform admin account...");
  await db
    .insert(users)
    .values({ email: CONFIG.ownerEmail, name: "Platform admin", role: "admin", isPlatformAdmin: true })
    .onConflictDoUpdate({ target: users.email, set: { isPlatformAdmin: true, role: "admin" } });

  console.log("Seeding policy versions...");
  for (const policy of [...POLICIES, MINOR_DISPLAY_CONSENT]) {
    await db.insert(policyVersions).values({ slug: policy.slug, version: policy.version, bodyMarkdown: policy.body });
  }

  console.log("Creating tracks...");
  const [trackA] = await db
    .insert(tracks)
    .values({
      slug: "millhaven-kart-club",
      name: "Millhaven Kart Club (demo)",
      isFictionalDemo: true,
      city: "Millhaven",
      region: "OH",
      country: "US",
      lat: 40.39,
      lng: -82.91,
      freeFirstYear: true,
    })
    .returning();

  const [trackB] = await db
    .insert(tracks)
    .values({
      slug: "cedar-ridge-raceway",
      name: "Cedar Ridge Raceway (demo)",
      isFictionalDemo: true,
      city: "Cedar Ridge",
      region: "PA",
      country: "US",
      lat: 41.2,
      lng: -77.1,
    })
    .returning();

  console.log("Creating racers, guardians, transponders...");
  const lastNamePool = [...LAST_NAMES];
  const racerRows: (typeof racers.$inferSelect)[] = [];

  for (let i = 0; i < 40; i++) {
    const cls = CLASSES[i % CLASSES.length];
    const age = randInt(rng, cls.minAge, cls.maxAge);
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - age);
    dob.setMonth(randInt(rng, 0, 11));

    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = lastNamePool[i % lastNamePool.length];
    const homeTrack = i % 2 === 0 ? trackA : trackB;
    const { isMinor } = inferIsMinor({ dob, className: cls.name });
    const slug = `${firstName}-${lastName}-${i}`.toLowerCase();

    const [racer] = await db
      .insert(racers)
      .values({
        slug,
        firstName,
        lastName,
        dob: dob.toISOString().slice(0, 10),
        isMinor,
        numberDefault: String(randInt(rng, 1, 199)),
        classDefault: cls.name,
        homeTrackId: homeTrack.id,
        town: isMinor ? null : pick(rng, ["Millhaven", "Cedar Ridge", "Ashford", "Brookline"]),
        socialFollowingSelfReported: isMinor ? null : randInt(rng, 40, 2200),
        trackdayAttendanceSelfReported: randInt(rng, 4, 20),
        isFictionalDemo: true,
        bio: null,
        story: null,
      })
      .returning();
    racerRows.push(racer);

    if (isMinor) {
      const [guardianUser] = await db
        .insert(users)
        .values({
          name: `${lastName} Family (guardian)`,
          email: `guardian.${slug}@seed.example`,
          role: "guardian",
        })
        .returning();
      const [guardianRow] = await db
        .insert(guardians)
        .values({ userId: guardianUser.id })
        .returning();
      await db.insert(guardianRacers).values({ guardianId: guardianRow.id, racerId: racer.id });
    }

    const [transponder] = await db
      .insert(transponders)
      .values({ number: `TX-${10000 + i}` })
      .returning();
    await db.insert(transponderAssignments).values({
      transponderId: transponder.id,
      racerId: racer.id,
      startDate: "2026-01-01",
    });
  }

  console.log("Creating season (series + events + sessions + results)...");
  const seasonYear = 2026;
  const eventDates = ["2026-04-12", "2026-05-03", "2026-05-24", "2026-06-14", "2026-07-05"];

  for (const track of [trackA, trackB]) {
    await db.insert(series).values({
      trackId: track.id,
      name: `${track.name} — ${seasonYear} Championship`,
      seasonYear,
      classes: CLASSES.map((c) => c.name),
      pointsSystem: Object.fromEntries(POINTS.map((p, idx) => [String(idx + 1), p])),
      dropScores: 1,
    });
  }

  let selfReportedInjected = 0;

  for (const track of [trackA, trackB]) {
    const trackRacers = racerRows.filter((r) => r.homeTrackId === track.id);

    for (const eventDate of eventDates) {
      const [event] = await db
        .insert(events)
        .values({ trackId: track.id, name: `${track.name.split(" (")[0]} Round`, date: eventDate, isFictionalDemo: true })
        .returning();

      for (const cls of CLASSES) {
        let attendees = trackRacers.filter((r) => r.classDefault === cls.name && rng() < 0.82);
        const allInClass = trackRacers.filter((r) => r.classDefault === cls.name);
        if (attendees.length < 2 && allInClass.length >= 2) attendees = allInClass.slice(0, Math.max(2, attendees.length));
        if (attendees.length < 2) continue;

        const skillByRacer = new Map(attendees.map((r) => [r.id, randInt(rng, -1400, 1400)]));

        for (const sessionType of ["practice", "qualifying", "race"] as const) {
          const [session] = await db
            .insert(raceSessions)
            .values({ eventId: event.id, type: sessionType, className: cls.name })
            .returning();

          const numLaps = sessionType === "race" ? 12 : sessionType === "qualifying" ? 3 : 8;
          const rowsToRank: { racerId: string; lapTimes: number[]; dnf: boolean; dns: boolean }[] = [];

          for (const racer of attendees) {
            const dns = sessionType === "race" && rng() < 0.03;
            const dnf = !dns && sessionType === "race" && rng() < 0.06;
            const lapTimes = dns ? [] : generateLaps(dnf ? randInt(rng, 2, 6) : numLaps, cls.baseLapMs, skillByRacer.get(racer.id)!);
            rowsToRank.push({ racerId: racer.id, lapTimes, dnf, dns });
          }

          const finishers = rowsToRank
            .filter((r) => !r.dns && !r.dnf)
            .sort((a, b) => a.lapTimes.reduce((s, l) => s + l, 0) - b.lapTimes.reduce((s, l) => s + l, 0));
          const leaderTotal = finishers[0] ? finishers[0].lapTimes.reduce((s, l) => s + l, 0) : 0;

          for (const entry of rowsToRank) {
            const isFinisherRanked = !entry.dns && !entry.dnf;
            const rankIndex = isFinisherRanked ? finishers.indexOf(entry) : -1;
            const total = entry.lapTimes.reduce((s, l) => s + l, 0);
            const best = entry.lapTimes.length ? Math.min(...entry.lapTimes) : null;
            const finalPosition = isFinisherRanked ? rankIndex + 1 : null;

            let provenance: "transponder_verified" | "self_reported" = "transponder_verified";
            if (sessionType === "race" && selfReportedInjected < 3 && rng() < 0.05) {
              provenance = "self_reported";
              selfReportedInjected++;
            }

            const [result] = await db
              .insert(results)
              .values({
                sessionId: session.id,
                racerId: entry.racerId,
                kartNumber: racerRows.find((r) => r.id === entry.racerId)?.numberDefault,
                position: finalPosition,
                laps: entry.lapTimes.length,
                bestLapMs: best,
                totalTimeMs: entry.lapTimes.length ? total : null,
                gapMs: isFinisherRanked && finalPosition! > 1 ? total - leaderTotal : isFinisherRanked ? 0 : null,
                status: entry.dns ? "dns" : entry.dnf ? "dnf" : "finished",
                points: sessionType === "race" ? pointsForPosition(finalPosition) : null,
                provenance,
                ingestPath: "mylaps",
                sourceRef: { demoFixture: true, track: track.slug, event: eventDate, session: sessionType, class: cls.name },
                publishedAt: new Date(),
              })
              .returning();

            if ((sessionType === "race" || sessionType === "practice") && entry.lapTimes.length) {
              await db.insert(laps).values(
                entry.lapTimes.map((lapTimeMs, idx) => ({
                  resultId: result.id,
                  lapNumber: idx + 1,
                  lapTimeMs,
                }))
              );
            }
          }
        }
      }
    }
  }

  console.log("Claiming a subset of racers...");
  const claimableAdults = racerRows.filter((r) => !r.isMinor).slice(0, 8);
  const claimableMinor = racerRows.find((r) => r.isMinor);

  for (const racer of claimableAdults) {
    const [user] = await db
      .insert(users)
      .values({ name: `${racer.firstName} ${racer.lastName}`, email: `${racer.slug}@seed.example`, role: "racer" })
      .returning();
    await db.update(racers).set({ userId: user.id, claimStatus: "claimed" }).where(sql`${racers.id} = ${racer.id}`);
    await db.insert(claims).values({ racerId: racer.id, claimedByUserId: user.id, verifiedVia: "email", isGuardianClaim: false });
  }

  if (claimableMinor) {
    const guardianLink = await db
      .select()
      .from(guardianRacers)
      .where(sql`${guardianRacers.racerId} = ${claimableMinor.id}`);
    if (guardianLink[0]) {
      const [guardianRow] = await db.select().from(guardians).where(sql`${guardians.id} = ${guardianLink[0].guardianId}`);
      await db
        .update(racers)
        .set({ claimStatus: "claimed", minorDisplayConsentAt: new Date() })
        .where(sql`${racers.id} = ${claimableMinor.id}`);
      await db.insert(claims).values({
        racerId: claimableMinor.id,
        claimedByUserId: guardianRow.userId,
        verifiedVia: "guardian_verification",
        isGuardianClaim: true,
      });
    }
  }

  console.log("Creating the /demo showcase racer...");
  const demoRacer = await createDemoRacer(trackA);
  await seedZonesForRacer(demoRacer.id, 4);

  console.log("Listing zones for a few claimed racers (marketplace seed data)...");
  for (const racer of claimableAdults.slice(0, 3)) {
    await seedZonesForRacer(racer.id, randInt(rng, 1, 3));
  }

  console.log("Recomputing ratings...");
  const result = await recomputeAllRatings();
  console.log(`Ratings recomputed: ${result.racesProcessed} races across ${result.classesProcessed} classes.`);

  console.log("Seed complete.");
  console.log(`Self-reported test results injected: ${selfReportedInjected}`);
}

