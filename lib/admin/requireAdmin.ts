import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Section 13's admin console needs real gating now that Auth.js exists
 * (Phase 4) — the /admin and /admin/metrics routes built in Phases 1/3
 * predate auth and were explicitly flagged as temporary; this is that
 * flag being resolved, not a new requirement invented late.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/admin");
  if (!session.user.isPlatformAdmin) redirect("/");
  return session;
}
