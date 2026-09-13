import { describe, expect, it, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  connectAccounts, guardianRacers, guardians, racers, sponsorshipAgreements,
  sponsorships, users, zoneListings, zones,
} from "@/db/schema";
import {
  approveWinnerAsGuardian, confirmBySponsor, recordSponsorshipSale, releaseEscrow, runAutoReleaseSweep, uploadDecalPhoto,
} from "@/lib/sponsorships/escrow";
import { processWithdrawal } from "@/lib/sponsorships/withdrawal";

const RUN = process.env.DATABASE_URL ? describe : describe.skip;

RUN("escrow state machine (section 7)", () => {
  const cleanupRacerIds: string[] = [];
  const cleanupUserIds: string[] = [];

  afterAll(async () => {
    // Ordered to respect the onDelete: "restrict" FK from sponsorships to
    // racers — children before parents.
    for (const racerId of cleanupRacerIds) {
      const racerSponsorships = await db.select().from(sponsorships).where(eq(sponsorships.racerId, racerId));
      for (const s of racerSponsorships) {
        await db.delete(sponsorshipAgreements).where(eq(sponsorshipAgreements.sponsorshipId, s.id));
      }
      await db.delete(sponsorships).where(eq(sponsorships.racerId, racerId));
      const racerZones = await db.select().from(zones).where(eq(zones.racerId, racerId));
      for (const z of racerZones) {
        await db.delete(zoneListings).where(eq(zoneListings.zoneId, z.id));
      }
      await db.delete(zones).where(eq(zones.racerId, racerId));
      await db.delete(guardianRacers).where(eq(guardianRacers.racerId, racerId));
      await db.delete(racers).where(eq(racers.id, racerId));
    }
    for (const userId of cleanupUserIds) {
      await db.delete(connectAccounts).where(eq(connectAccounts.ownerId, userId));
      await db.delete(guardians).where(eq(guardians.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  async function setupAdultRacerWithListing() {
    const suffix = Date.now() + Math.random();
    const [sponsorUser] = await db.insert(users).values({ email: `escrow-sponsor-${suffix}@seed.example`, role: "sponsor" }).returning();
    const [racerUser] = await db.insert(users).values({ email: `escrow-racer-${suffix}@seed.example`, role: "racer" }).returning();
    const [racer] = await db
      .insert(racers)
      .values({ slug: `escrow-adult-${suffix}`, firstName: "Test", lastName: "Adult", isMinor: false, userId: racerUser.id, claimStatus: "claimed" })
      .returning();
    const [zone] = await db.insert(zones).values({ racerId: racer.id, name: "Nose Cone", tier: "premium" }).returning();
    const [listing] = await db.insert(zoneListings).values({ zoneId: zone.id, listingType: "buy_now", term: "season", priceUsd: 200, isActive: true }).returning();
    const [connectAccount] = await db.insert(connectAccounts).values({ ownerType: "racer", ownerId: racerUser.id, stripeAccountId: "acct_test_fake" }).returning();

    cleanupRacerIds.push(racer.id);
    cleanupUserIds.push(sponsorUser.id, racerUser.id);

    return { sponsorUser, racerUser, racer, zone, listing, connectAccount };
  }

  async function setupMinorRacerWithGuardian() {
    const suffix = Date.now() + Math.random();
    const [sponsorUser] = await db.insert(users).values({ email: `escrow-sponsor-m-${suffix}@seed.example`, role: "sponsor" }).returning();
    const [guardianUser] = await db.insert(users).values({ email: `escrow-guardian-${suffix}@seed.example`, role: "guardian" }).returning();
    const [guardianRow] = await db.insert(guardians).values({ userId: guardianUser.id }).returning();
    const [racer] = await db
      .insert(racers)
      .values({ slug: `escrow-minor-${suffix}`, firstName: "Test", lastName: "Minor", isMinor: true, claimStatus: "claimed" })
      .returning();
    await db.insert(guardianRacers).values({ guardianId: guardianRow.id, racerId: racer.id });
    const [zone] = await db.insert(zones).values({ racerId: racer.id, name: "Helmet Top", tier: "premium" }).returning();
    const [listing] = await db.insert(zoneListings).values({ zoneId: zone.id, listingType: "buy_now", term: "season", priceUsd: 220, isActive: true, guardianApprovedAt: new Date() }).returning();
    const [connectAccount] = await db.insert(connectAccounts).values({ ownerType: "guardian", ownerId: guardianUser.id, stripeAccountId: "acct_test_fake_guardian" }).returning();

    cleanupRacerIds.push(racer.id);
    cleanupUserIds.push(sponsorUser.id, guardianUser.id);

    return { sponsorUser, guardianUser, racer, zone, listing, connectAccount };
  }

  it("an adult racer's sale skips guardian approval and goes straight to awaiting the decal", async () => {
    const { sponsorUser, racer, listing, connectAccount } = await setupAdultRacerWithListing();
    const fakeTransfer = async () => "tr_fake_123";

    const sponsorship = await recordSponsorshipSale({
      listingId: listing.id,
      racerId: racer.id,
      sponsorUserId: sponsorUser.id,
      amountUsd: 200,
      platformFeeUsd: 24,
      trackRevShareUsd: 0,
      racerNetUsd: 176,
      stripeChargeId: "ch_fake_1",
      term: "season",
    });
    expect(sponsorship.status).toBe("charged_pending_decal");

    const afterDecal = await uploadDecalPhoto(sponsorship.id, "https://example.com/decal.jpg");
    expect(afterDecal.status).toBe("awaiting_sponsor_confirmation");
    expect(afterDecal.autoReleaseAt).not.toBeNull();

    const released = await confirmBySponsor(sponsorship.id, sponsorUser.id, fakeTransfer);
    expect(released.status).toBe("released");
    expect(released.stripeTransferId).toBe("tr_fake_123");

    void connectAccount;
  });

  it("a minor's sale is blocked from release until the guardian approves the winner", async () => {
    const { sponsorUser, guardianUser, racer, listing } = await setupMinorRacerWithGuardian();

    const sponsorship = await recordSponsorshipSale({
      listingId: listing.id,
      racerId: racer.id,
      sponsorUserId: sponsorUser.id,
      amountUsd: 220,
      platformFeeUsd: 26.4,
      trackRevShareUsd: 0,
      racerNetUsd: 193.6,
      stripeChargeId: "ch_fake_2",
      term: "season",
    });
    expect(sponsorship.status).toBe("pending_guardian_approval");

    // Cannot upload a decal or release before guardian approval — the
    // state machine itself refuses, not just the UI.
    await expect(uploadDecalPhoto(sponsorship.id, "https://example.com/decal.jpg")).rejects.toThrow();

    const approved = await approveWinnerAsGuardian(sponsorship.id, guardianUser.id);
    expect(approved.status).toBe("charged_pending_decal");

    const afterDecal = await uploadDecalPhoto(sponsorship.id, "https://example.com/decal.jpg");
    expect(afterDecal.status).toBe("awaiting_sponsor_confirmation");

    const fakeTransfer = async () => "tr_fake_456";
    const released = await runAutoReleaseSweep(new Date(afterDecal.autoReleaseAt!.getTime() + 1000), fakeTransfer);
    expect(released.releasedCount).toBeGreaterThanOrEqual(1);

    const [final] = await db.select().from(sponsorships).where(eq(sponsorships.id, sponsorship.id));
    expect(final.status).toBe("released");
  });

  it("a stranger cannot approve someone else's minor's sponsorship", async () => {
    const { sponsorUser, racer, listing } = await setupMinorRacerWithGuardian();
    const [imposter] = await db.insert(users).values({ email: `escrow-imposter-${Date.now()}@seed.example`, role: "guardian" }).returning();
    cleanupUserIds.push(imposter.id);

    const sponsorship = await recordSponsorshipSale({
      listingId: listing.id,
      racerId: racer.id,
      sponsorUserId: sponsorUser.id,
      amountUsd: 220,
      platformFeeUsd: 26.4,
      trackRevShareUsd: 0,
      racerNetUsd: 193.6,
      stripeChargeId: "ch_fake_3",
      term: "season",
    });

    await expect(approveWinnerAsGuardian(sponsorship.id, imposter.id)).rejects.toThrow();
  });

  it("a mid-term withdrawal issues a pro-rata refund and marks the sponsorship terminal", async () => {
    const { sponsorUser, racer, listing } = await setupAdultRacerWithListing();
    const sponsorship = await recordSponsorshipSale({
      listingId: listing.id,
      racerId: racer.id,
      sponsorUserId: sponsorUser.id,
      amountUsd: 200,
      platformFeeUsd: 24,
      trackRevShareUsd: 0,
      racerNetUsd: 176,
      stripeChargeId: "ch_fake_4",
      term: "season",
    });

    let refundedAmount = 0;
    const fakeRefund = async ({ amountUsd }: { amountUsd: number }) => {
      refundedAmount = amountUsd;
    };
    const { unservedUsd } = await processWithdrawal(sponsorship.id, "refund", fakeRefund);
    expect(unservedUsd).toBeGreaterThan(0);
    expect(refundedAmount).toBe(unservedUsd);

    const [final] = await db.select().from(sponsorships).where(eq(sponsorships.id, sponsorship.id));
    expect(final.status).toBe("refunded");

    // A second withdrawal attempt on an already-terminal sponsorship must fail.
    await expect(processWithdrawal(sponsorship.id, "refund", fakeRefund)).rejects.toThrow();
  });

  it("releaseEscrow refuses to run twice on the same sponsorship", async () => {
    const { sponsorUser, racer, listing } = await setupAdultRacerWithListing();
    const sponsorship = await recordSponsorshipSale({
      listingId: listing.id,
      racerId: racer.id,
      sponsorUserId: sponsorUser.id,
      amountUsd: 200,
      platformFeeUsd: 24,
      trackRevShareUsd: 0,
      racerNetUsd: 176,
      stripeChargeId: "ch_fake_5",
      term: "season",
    });
    await uploadDecalPhoto(sponsorship.id, "https://example.com/decal.jpg");
    const fakeTransfer = async () => "tr_fake_789";
    await releaseEscrow(sponsorship.id, fakeTransfer);
    await expect(releaseEscrow(sponsorship.id, fakeTransfer)).rejects.toThrow();
  });
});
