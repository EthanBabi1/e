import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { guardianRacers, guardians, messageThreads, messages, racers, threadReports, userBlocks } from "@/db/schema";
import { checkForContactInfo } from "./filter";
import { sendNotification } from "@/lib/notifications/dispatch";

const RATE_LIMIT_MAX_MESSAGES = 10;
const RATE_LIMIT_WINDOW_MINUTES = 10;

/**
 * Section 6: "For any under-18 racer the thread is with the guardian. The
 * racer account never receives direct sponsor messages, and the UI says
 * so plainly to both sides." `guardianUserId` is resolved once, at
 * thread-creation time, from whichever guardian is currently linked.
 */
export async function getOrCreateThread(params: { racerId: string; sponsorUserId: string; zoneListingId?: string }) {
  const [existing] = await db
    .select()
    .from(messageThreads)
    .where(
      and(
        eq(messageThreads.racerId, params.racerId),
        eq(messageThreads.sponsorUserId, params.sponsorUserId),
        params.zoneListingId ? eq(messageThreads.zoneListingId, params.zoneListingId) : sql`zone_listing_id is null`
      )
    );
  if (existing) return existing;

  const [racer] = await db.select().from(racers).where(eq(racers.id, params.racerId));
  if (!racer) throw new Error("Racer not found");

  let guardianUserId: string | null = null;
  if (racer.isMinor) {
    const [link] = await db.select().from(guardianRacers).where(eq(guardianRacers.racerId, params.racerId));
    if (link) {
      const [guardianRow] = await db.select().from(guardians).where(eq(guardians.id, link.guardianId));
      guardianUserId = guardianRow?.userId ?? null;
    }
  }

  const [thread] = await db
    .insert(messageThreads)
    .values({
      racerId: params.racerId,
      sponsorUserId: params.sponsorUserId,
      zoneListingId: params.zoneListingId,
      guardianUserId,
    })
    .returning();
  return thread;
}

export function isMinorThread(thread: { guardianUserId: string | null }): boolean {
  return thread.guardianUserId != null;
}

/** Section 6: rate limiting on message sends, per sender per thread. */
async function isRateLimited(threadId: string, senderUserId: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(and(eq(messages.threadId, threadId), eq(messages.senderUserId, senderUserId), gte(messages.createdAt, windowStart)));
  return Number(row?.count ?? 0) >= RATE_LIMIT_MAX_MESSAGES;
}

export type SendMessageResult =
  | { status: "sent"; messageId: string }
  | { status: "blocked_contact_info"; reason: string }
  | { status: "rate_limited" };

/**
 * Section 6's contact-filtering rule applies specifically to threads
 * involving a minor — an adult racer's thread isn't filtered (there's no
 * minor-protection reason to block a phone number between two adults who
 * choose to exchange one, though staying on-platform is still encouraged
 * elsewhere in the product). A blocked send is never persisted — the
 * point is that the contact info never lands in the database at all.
 */
export async function sendMessage(params: { threadId: string; senderUserId: string; body: string }): Promise<SendMessageResult> {
  if (await isRateLimited(params.threadId, params.senderUserId)) {
    return { status: "rate_limited" };
  }

  const [thread] = await db.select().from(messageThreads).where(eq(messageThreads.id, params.threadId));
  if (!thread) throw new Error("Thread not found");

  if (isMinorThread(thread)) {
    const check = checkForContactInfo(params.body);
    if (check.blocked) {
      return { status: "blocked_contact_info", reason: check.reason! };
    }
  }

  const [message] = await db
    .insert(messages)
    .values({ threadId: params.threadId, senderUserId: params.senderUserId, body: params.body })
    .returning();

  // Notify whichever side didn't just send this — the guardian (if a
  // minor's thread), else the sponsor or the racer, whichever they aren't.
  const recipientUserId = isMinorThread(thread)
    ? thread.guardianUserId!
    : thread.sponsorUserId === params.senderUserId
      ? await resolveRacerOwnerUserId(thread.racerId)
      : thread.sponsorUserId;
  if (recipientUserId && recipientUserId !== params.senderUserId) {
    await sendNotification(
      { kind: "user", userId: recipientUserId },
      "social",
      { type: "new_message", title: "New message", body: params.body.slice(0, 140), linkUrl: `/dashboard/messages/${params.threadId}` }
    );
  }

  return { status: "sent", messageId: message.id };
}

async function resolveRacerOwnerUserId(racerId: string): Promise<string | null> {
  const [racer] = await db.select().from(racers).where(eq(racers.id, racerId));
  return racer?.userId ?? null;
}

export async function reportThread(threadId: string, reportedByUserId: string, reason: string) {
  await db.insert(threadReports).values({ threadId, reportedByUserId, reason });
}

export async function blockUser(blockerUserId: string, blockedUserId: string) {
  await db.insert(userBlocks).values({ blockerUserId, blockedUserId });
}

export async function isBlocked(blockerUserId: string, blockedUserId: string): Promise<boolean> {
  const [row] = await db
    .select()
    .from(userBlocks)
    .where(and(eq(userBlocks.blockerUserId, blockerUserId), eq(userBlocks.blockedUserId, blockedUserId)));
  return !!row;
}
