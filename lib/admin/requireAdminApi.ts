import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAuditEvent } from "./audit";

/** API-route counterpart to requireAdmin() — returns a response to send
 * back (never null-but-should-redirect, since redirect() only works
 * inside a Server Component render) or null if the caller is a real admin. */
export async function requireAdminApi(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!session.user.isPlatformAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  return null;
}

export async function requireAdminApiWithAudit(action: string, metadata: Record<string, unknown> = {}) {
  const session = await auth();
  if (!session?.user) return { denied: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  if (!session.user.isPlatformAdmin) return { denied: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  await logAuditEvent(session.user.id, action, metadata);
  return { denied: null, adminUserId: session.user.id };
}
