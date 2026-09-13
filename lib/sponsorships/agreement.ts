import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { policyVersions, sponsorshipAgreements } from "@/db/schema";
import { CONFIG } from "@/lib/config";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Section 6: "Every completed sponsorship generates an agreement record
 * both parties accept at checkout." Term length is a reasonable default
 * (a season = 6 months from purchase, a per-event term = 30 days) rather
 * than reading the track's actual published calendar — that would need
 * checkout to already know which specific events a season listing
 * covers, which isn't wired up yet. Flagged in DECISIONS.md.
 */
export async function createSponsorshipAgreement(params: {
  sponsorshipId: string;
  term: "season" | "per_event";
  logoDeliveryDays?: number;
}) {
  const [withdrawalPolicy] = await db.select().from(policyVersions).where(eq(policyVersions.slug, "sponsorship-terms"));

  const now = new Date();
  const termEnd = new Date(now.getTime() + (params.term === "season" ? 182 : 30) * MS_PER_DAY);
  const logoDeadline = new Date(now.getTime() + (params.logoDeliveryDays ?? 14) * MS_PER_DAY);

  const [agreement] = await db
    .insert(sponsorshipAgreements)
    .values({
      sponsorshipId: params.sponsorshipId,
      termStart: now.toISOString().slice(0, 10),
      termEnd: termEnd.toISOString().slice(0, 10),
      eventsCovered: params.term === "per_event" ? 1 : null,
      logoDeliveryDeadline: logoDeadline.toISOString().slice(0, 10),
      withdrawalPolicySnapshot: `Withdrawal policy: ${CONFIG.withdrawalPolicy}. ` + (withdrawalPolicy?.bodyMarkdown ?? "See /sponsorship-terms."),
      policyVersionId: withdrawalPolicy?.id ?? "unversioned",
    })
    .returning();
  return agreement;
}

export async function acceptAgreementAsSponsor(agreementId: string) {
  await db.update(sponsorshipAgreements).set({ acceptedBySponsorAt: new Date() }).where(eq(sponsorshipAgreements.id, agreementId));
}

export async function acceptAgreementAsRacerOrGuardian(agreementId: string) {
  await db.update(sponsorshipAgreements).set({ acceptedByRacerOrGuardianAt: new Date() }).where(eq(sponsorshipAgreements.id, agreementId));
}
