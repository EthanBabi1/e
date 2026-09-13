import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { guardianRacers, guardians, notifications, racers, users } from "@/db/schema";
import { sendFinancialNotificationForRacer } from "@/lib/notifications/dispatch";

const RUN = process.env.DATABASE_URL ? describe : describe.skip;

/**
 * DoD (section 16): "No email containing financial information can be
 * addressed to an under-18 account — covered by test." This is the test.
 */
RUN("financial notifications never reach a minor directly", () => {
  let minorRacerId: string;
  let guardianUserId: string;
  let adultRacerId: string;
  let adultUserId: string;

  beforeAll(async () => {
    const suffix = Date.now();

    const [guardianUser] = await db.insert(users).values({ email: `guardian-${suffix}@seed.example`, role: "guardian" }).returning();
    guardianUserId = guardianUser.id;
    const [guardianRow] = await db.insert(guardians).values({ userId: guardianUserId }).returning();

    const [minorRacer] = await db
      .insert(racers)
      .values({ slug: `fin-test-minor-${suffix}`, firstName: "Test", lastName: "Minor", isMinor: true, claimStatus: "claimed" })
      .returning();
    minorRacerId = minorRacer.id;
    await db.insert(guardianRacers).values({ guardianId: guardianRow.id, racerId: minorRacerId });

    const [adultUser] = await db.insert(users).values({ email: `adult-${suffix}@seed.example`, role: "racer" }).returning();
    adultUserId = adultUser.id;
    const [adultRacer] = await db
      .insert(racers)
      .values({ slug: `fin-test-adult-${suffix}`, firstName: "Test", lastName: "Adult", isMinor: false, userId: adultUserId, claimStatus: "claimed" })
      .returning();
    adultRacerId = adultRacer.id;
  });

  afterAll(async () => {
    await db.delete(notifications).where(eq(notifications.userId, guardianUserId));
    await db.delete(notifications).where(eq(notifications.userId, adultUserId));
    await db.delete(racers).where(eq(racers.id, minorRacerId));
    await db.delete(racers).where(eq(racers.id, adultRacerId));
  });

  it("routes a financial notification about a minor to the guardian's account, never the minor's", async () => {
    await sendFinancialNotificationForRacer(minorRacerId, {
      type: "sponsorship_sold",
      title: "A sponsorship sold on this profile",
      body: "$180 for the Nose Cone zone.",
    });

    const guardianNotifs = await db.select().from(notifications).where(eq(notifications.userId, guardianUserId));
    expect(guardianNotifs).toHaveLength(1);
    expect(guardianNotifs[0].category).toBe("financial");

    // There is no user account belonging to the minor themself in this
    // scenario (minors don't get their own login — guardians hold the
    // account, per section 2) — so the strongest assertion available is
    // that the guardian, and only the guardian, received it.
    const allFinancial = await db.select().from(notifications).where(eq(notifications.category, "financial"));
    const guardianOnly = allFinancial.every((n) => n.userId === guardianUserId || n.userId === adultUserId);
    expect(guardianOnly).toBe(true);
  });

  it("routes a financial notification about an adult racer to their own account", async () => {
    await sendFinancialNotificationForRacer(adultRacerId, {
      type: "payout_released",
      title: "Payout released",
      body: "$180 transferred to your account.",
    });

    const adultNotifs = await db.select().from(notifications).where(eq(notifications.userId, adultUserId));
    expect(adultNotifs).toHaveLength(1);
    expect(adultNotifs[0].category).toBe("financial");
  });

  it("does nothing (never guesses a fallback recipient) for a minor with no guardian on file", async () => {
    const [orphanMinor] = await db
      .insert(racers)
      .values({ slug: `fin-test-orphan-${Date.now()}`, firstName: "Test", lastName: "Orphan", isMinor: true, claimStatus: "unclaimed" })
      .returning();

    await sendFinancialNotificationForRacer(orphanMinor.id, { type: "sponsorship_sold", title: "Should not be sent" });

    const all = await db.select().from(notifications).where(eq(notifications.title, "Should not be sent"));
    expect(all).toHaveLength(0);

    await db.delete(racers).where(eq(racers.id, orphanMinor.id));
  });
});
