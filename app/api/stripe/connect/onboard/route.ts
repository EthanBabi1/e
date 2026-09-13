import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrCreateConnectAccount, createOnboardingLink } from "@/lib/stripe/connect";
import { getManagedRacers } from "@/lib/dashboard/getCurrentRacer";

/** Section 7: "Each racer or guardian gets a connected account." Starts
 * (or resumes) Express onboarding for the signed-in user. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const managed = await getManagedRacers(session.user.id);
  const ownerType = managed.some((r) => r.isMinor) ? "guardian" : "racer";

  const account = await getOrCreateConnectAccount(ownerType, session.user.id, session.user.email);
  const url = await createOnboardingLink(account.stripeAccountId, "/dashboard");
  return NextResponse.json({ url });
}
