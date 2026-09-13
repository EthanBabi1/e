import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { claimInvitations, claims, guardianRacers, guardians, policyAcceptances, racers } from "@/db/schema";
import { logEvent, ANALYTICS_EVENTS } from "@/lib/analytics/events";

export async function createClaimInvitation(racerId: string) {
  const [invite] = await db.insert(claimInvitations).values({ racerId, token: nanoid(24) }).returning();
  return invite;
}

export async function getClaimInvitation(token: string) {
  const [invite] = await db.select().from(claimInvitations).where(eq(claimInvitations.token, token));
  return invite ?? null;
}

/**
 * An adult claiming their own profile — section 3: "Claiming is free and
 * requires email verification... or guardian verification for minors."
 * Email verification is satisfied by the caller already being an
 * authenticated Auth.js session (magic-link sign-in IS the email proof);
 * this function only records the claim, it doesn't re-verify email itself.
 */
export async function claimAsAdult(params: { racerId: string; userId: string; invitationToken?: string }) {
  const [racer] = await db.select().from(racers).where(eq(racers.id, params.racerId));
  if (!racer) throw new Error("Racer not found");
  if (racer.isMinor) throw new Error("This profile belongs to a minor — use claimAsGuardian instead");
  if (racer.claimStatus === "claimed") throw new Error("This profile is already claimed");

  await db.update(racers).set({ userId: params.userId, claimStatus: "claimed" }).where(eq(racers.id, params.racerId));
  await db.insert(claims).values({
    racerId: params.racerId,
    claimedByUserId: params.userId,
    verifiedVia: params.invitationToken ? "track_confirmation" : "email",
    isGuardianClaim: false,
  });
  if (params.invitationToken) {
    await db.update(claimInvitations).set({ usedAt: new Date() }).where(eq(claimInvitations.token, params.invitationToken));
  }
  await logEvent(ANALYTICS_EVENTS.RACER_CLAIMED, { racerId: params.racerId, userId: params.userId, metadata: { isGuardianClaim: false } });
}

/**
 * A guardian claiming a minor's profile — section 2's ordered requirement:
 * guardian consent + a claim record, both created together. This build has
 * no third-party identity/KYC service to confirm the claimant is actually
 * the minor's legal guardian (flagged in REVIEW.md); what's enforced here
 * is the product-level contract — a distinct consent step, a policy
 * acceptance record, and the guardian (never the minor) becoming the
 * account holder — not a verified real-world identity check.
 */
export async function claimAsGuardian(params: {
  racerId: string;
  guardianUserId: string;
  relationship: string;
  consentPolicyVersionId: string;
  invitationToken?: string;
}) {
  const [racer] = await db.select().from(racers).where(eq(racers.id, params.racerId));
  if (!racer) throw new Error("Racer not found");
  if (!racer.isMinor) throw new Error("This profile is not a minor's — use claimAsAdult instead");
  if (racer.claimStatus === "claimed") throw new Error("This profile is already claimed");

  let [guardianRow] = await db.select().from(guardians).where(eq(guardians.userId, params.guardianUserId));
  if (!guardianRow) {
    [guardianRow] = await db.insert(guardians).values({ userId: params.guardianUserId }).returning();
  }

  await db.insert(guardianRacers).values({ guardianId: guardianRow.id, racerId: params.racerId, isPrimary: true });

  const consentTimestamp = new Date();
  await db.insert(policyAcceptances).values({
    userId: params.guardianUserId,
    policyVersionId: params.consentPolicyVersionId,
    acceptedAt: consentTimestamp,
  });

  await db
    .update(racers)
    .set({ claimStatus: "claimed", minorDisplayConsentAt: consentTimestamp })
    .where(eq(racers.id, params.racerId));

  await db.insert(claims).values({
    racerId: params.racerId,
    claimedByUserId: params.guardianUserId,
    verifiedVia: "guardian_verification",
    isGuardianClaim: true,
  });

  if (params.invitationToken) {
    await db.update(claimInvitations).set({ usedAt: new Date() }).where(eq(claimInvitations.token, params.invitationToken));
  }

  await logEvent(ANALYTICS_EVENTS.RACER_CLAIMED, {
    racerId: params.racerId,
    userId: params.guardianUserId,
    metadata: { isGuardianClaim: true, relationship: params.relationship },
  });
}
