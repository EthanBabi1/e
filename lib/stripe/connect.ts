import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { connectAccounts, guardianRacers, guardians } from "@/db/schema";
import { getStripeClient } from "./client";
import { CONFIG } from "@/lib/config";

type ConnectOwnerType = "guardian" | "racer" | "track";

/**
 * Section 2/7's hard rule made structural: this function's `ownerType`
 * union has no "minor" option, and the only caller path from a racer id
 * (`createConnectAccountForRacer` below) resolves a minor to their
 * guardian's id before this ever runs — there is no code path that
 * creates a Connect account naming a minor as the owner.
 */
export async function getOrCreateConnectAccount(ownerType: ConnectOwnerType, ownerId: string, email: string) {
  const [existing] = await db
    .select()
    .from(connectAccounts)
    .where(eq(connectAccounts.ownerId, ownerId));
  if (existing) return existing;

  const stripe = getStripeClient();
  const account = await stripe.accounts.create({
    type: "express",
    email,
    capabilities: { transfers: { requested: true } },
  });

  const [row] = await db
    .insert(connectAccounts)
    .values({ ownerType, ownerId, stripeAccountId: account.id })
    .returning();
  return row;
}

export async function createOnboardingLink(stripeAccountId: string, returnPath: string) {
  const stripe = getStripeClient();
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `https://${CONFIG.domain}${returnPath}?refresh=true`,
    return_url: `https://${CONFIG.domain}${returnPath}?onboarded=true`,
    type: "account_onboarding",
  });
  return link.url;
}

/**
 * The only entry point for setting up payouts starting from a racer id.
 * For a minor, this resolves to the guardian and creates (or reuses) the
 * guardian's own connected account — never one naming the minor.
 */
export async function getPayoutAccountOwnerForRacer(racer: { id: string; isMinor: boolean; userId: string | null }): Promise<{ ownerType: ConnectOwnerType; ownerId: string } | null> {
  if (!racer.isMinor) {
    if (!racer.userId) return null;
    return { ownerType: "racer", ownerId: racer.userId };
  }

  const [link] = await db.select().from(guardianRacers).where(eq(guardianRacers.racerId, racer.id));
  if (!link) return null;
  const [guardianRow] = await db.select().from(guardians).where(eq(guardians.id, link.guardianId));
  if (!guardianRow) return null;
  return { ownerType: "guardian", ownerId: guardianRow.userId };
}
