import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { logoReports, takedownRequests } from "@/db/schema";

export async function getOpenModerationQueue() {
  const [logos, takedowns] = await Promise.all([
    db.select().from(logoReports).where(eq(logoReports.status, "open")),
    db.select().from(takedownRequests).where(eq(takedownRequests.status, "open")),
  ]);
  return { logos, takedowns };
}

/** Section 6: report button + admin takedown action on a displayed logo. */
export async function resolveLogoReport(reportId: string, resolution: "resolved" | "rejected") {
  await db.update(logoReports).set({ status: resolution }).where(eq(logoReports.id, reportId));
}

/** Section 3: public /remove route, honored within 48 hours, admin-notified immediately. */
export async function resolveTakedownRequest(requestId: string, resolution: "resolved" | "rejected") {
  await db.update(takedownRequests).set({ status: resolution, resolvedAt: new Date() }).where(eq(takedownRequests.id, requestId));
}
