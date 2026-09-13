import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { guardianRacers, guardians, notificationPreferences, notifications, racers, users } from "@/db/schema";
import { sendEmail } from "@/lib/email/send";
import { GenericNotificationEmail } from "@/lib/email/templates/GenericNotificationEmail";

export type NotificationCategory = "transactional" | "financial" | "social" | "digest";

export interface RacerRecipient {
  kind: "racer";
  racerId: string;
}
export interface UserRecipient {
  kind: "user";
  userId: string;
}
export type Recipient = RacerRecipient | UserRecipient;

/**
 * Section 10 hard rule, also in the autonomy section's fixed minors list:
 * "Never send a minor an email about money. All financial notifications
 * route to the guardian." This is enforced BY TYPE, not by a runtime
 * check someone could forget: `sendFinancialNotification` below only
 * accepts a `UserRecipient`, so there is no calling convention that lets a
 * financial notification target a racer id directly. `resolveRecipient`
 * is what a non-financial notification uses, and it's the one place a
 * minor's own address would normally resolve — for financial notices we
 * skip it entirely and require the guardian's user id up front.
 */
export async function resolveRecipientUserId(recipient: Recipient): Promise<string | null> {
  if (recipient.kind === "user") return recipient.userId;

  const [racer] = await db.select().from(racers).where(eq(racers.id, recipient.racerId));
  if (!racer) return null;
  if (racer.userId) return racer.userId;
  return null; // unclaimed racer has no account to notify
}

/** For a minor racer, resolves to their guardian's user id — used by
 * anything that must never reach the racer directly (financial notices,
 * sponsor messages per section 6). */
export async function resolveGuardianUserId(racerId: string): Promise<string | null> {
  const [link] = await db.select().from(guardianRacers).where(eq(guardianRacers.racerId, racerId));
  if (!link) return null;
  const [guardianRow] = await db.select().from(guardians).where(eq(guardians.id, link.guardianId));
  return guardianRow?.userId ?? null;
}

async function isCategoryEnabled(userId: string, category: NotificationCategory): Promise<boolean> {
  if (category === "transactional") return true; // never suppressible
  const [pref] = await db
    .select()
    .from(notificationPreferences)
    .where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.category, category)));
  if (!pref) return true; // default on until a user opts out
  return pref.emailEnabled;
}

async function insertNotification(userId: string, category: NotificationCategory, fields: { type: string; title: string; body?: string; linkUrl?: string }) {
  await db.insert(notifications).values({
    userId,
    category,
    type: fields.type,
    title: fields.title,
    body: fields.body,
    linkUrl: fields.linkUrl,
  });

  const email = await getRecipientEmail(userId);
  if (email) {
    await sendEmail({
      to: email,
      subject: fields.title,
      react: GenericNotificationEmail({ title: fields.title, body: fields.body, linkUrl: fields.linkUrl }),
    });
  }
}

/** Ordinary notification path — resolves a racer recipient to their own
 * account if they have one (never used for the `financial` category, see
 * sendFinancialNotification). */
export async function sendNotification(
  recipient: Recipient,
  category: Exclude<NotificationCategory, "financial">,
  fields: { type: string; title: string; body?: string; linkUrl?: string }
) {
  const userId = await resolveRecipientUserId(recipient);
  if (!userId) return;
  if (!(await isCategoryEnabled(userId, category))) return;
  await insertNotification(userId, category, fields);
}

/**
 * The ONLY function that sends a `financial` notification. Takes a
 * guardian/user id directly — there is no overload that accepts a racer
 * id, which is what makes "never send a minor an email about money"
 * enforceable by the type signature rather than by a check that could be
 * skipped. See tests/unit/notifications-minor-financial.test.ts.
 */
export async function sendFinancialNotification(guardianOrAdultUserId: string, fields: { type: string; title: string; body?: string; linkUrl?: string }) {
  await insertNotification(guardianOrAdultUserId, "financial", fields);
}

/**
 * The one safe way to send a financial notification "about" a racer: it
 * looks up whether the racer is a minor and, if so, refuses to accept a
 * racer-targeted call at all — the caller must already know to route to
 * the guardian. This exists so a call site that has a racerId in hand
 * (not yet a resolved guardian id) still can't accidentally reach a minor.
 */
export async function sendFinancialNotificationForRacer(racerId: string, fields: { type: string; title: string; body?: string; linkUrl?: string }) {
  const [racer] = await db.select().from(racers).where(eq(racers.id, racerId));
  if (!racer) return;

  if (racer.isMinor) {
    const guardianUserId = await resolveGuardianUserId(racerId);
    if (!guardianUserId) return; // no guardian on file yet — nothing safe to notify
    await sendFinancialNotification(guardianUserId, fields);
    return;
  }

  if (!racer.userId) return; // unclaimed, no account to notify
  await sendFinancialNotification(racer.userId, fields);
}

export async function getRecipientEmail(userId: string): Promise<string | null> {
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
  return user?.email ?? null;
}
