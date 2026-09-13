import { db } from "@/db/client";
import { auditLog } from "@/db/schema";

/** Section 13: "manual payout controls, ... user impersonation for
 * support — logged, always, with the user informed in the audit trail." */
export async function logAuditEvent(actorUserId: string, action: string, metadata: Record<string, unknown> = {}, targetType?: string, targetId?: string) {
  await db.insert(auditLog).values({ actorUserId, action, targetType, targetId, metadata });
}
