import { CONFIG } from "@/lib/config";

export interface SponsorshipSplit {
  amountUsd: number;
  platformFeeUsd: number;
  trackRevShareUsd: number;
  racerNetUsd: number;
}

/**
 * Section 7's take-rate math, applied as a Stripe Connect application fee
 * conceptually (the platform never holds funds — see section 7's escrow
 * design). Rounding: platform fee and track rev share round to the
 * nearest cent independently; the racer's net absorbs whatever cent of
 * rounding remainder results, rather than the platform's cut growing by a
 * cent here and there across thousands of transactions.
 */
export function splitSponsorshipAmount(params: {
  amountUsd: number;
  subscriptionTier: "free" | "pro";
  trackEnrolledInRevShare: boolean;
}): SponsorshipSplit {
  const takeRate = params.subscriptionTier === "pro" ? CONFIG.takeRatePro : CONFIG.takeRateFree;
  const platformFeeUsd = Math.round(params.amountUsd * takeRate * 100) / 100;
  const trackRevShareUsd = params.trackEnrolledInRevShare
    ? Math.round(params.amountUsd * CONFIG.trackRevShare * 100) / 100
    : 0;
  const racerNetUsd = Math.round((params.amountUsd - platformFeeUsd - trackRevShareUsd) * 100) / 100;

  return { amountUsd: params.amountUsd, platformFeeUsd, trackRevShareUsd, racerNetUsd };
}

/**
 * Section 7's upgrade-arithmetic UI: "You've sold $2,100 this season. Pro
 * would have saved you $47." Compares what was actually paid in fees on
 * the free tier against what Pro's rate would have cost on the same
 * volume, minus the annual Pro price — never rounds in the platform's
 * favor when telling a racer whether to upgrade.
 */
export function computeProSavings(seasonGmvUsd: number): { feesSavedUsd: number; netBenefitUsd: number; worthIt: boolean } {
  const freeFees = seasonGmvUsd * CONFIG.takeRateFree;
  const proFees = seasonGmvUsd * CONFIG.takeRatePro;
  const feesSavedUsd = Math.round((freeFees - proFees) * 100) / 100;
  const netBenefitUsd = Math.round((feesSavedUsd - CONFIG.proAnnualUsd) * 100) / 100;
  return { feesSavedUsd, netBenefitUsd, worthIt: netBenefitUsd > 0 };
}
