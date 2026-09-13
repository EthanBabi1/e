import { asc, desc, eq, or } from "drizzle-orm";
import { db } from "@/db/client";
import { messageThreads, messages, racers } from "@/db/schema";

/**
 * Threads a user should see: as the sponsor who started them, as the
 * guardian a minor's threads route to, or — for an adult racer's own
 * profile — as the racer themself (adult racers DO receive messages
 * directly, section 6 only routes minors' threads elsewhere).
 */
export async function getThreadsForUser(userId: string) {
  const [ownRacer] = await db.select().from(racers).where(eq(racers.userId, userId));

  const conditions = [eq(messageThreads.sponsorUserId, userId), eq(messageThreads.guardianUserId, userId)];
  if (ownRacer && !ownRacer.isMinor) conditions.push(eq(messageThreads.racerId, ownRacer.id));

  const threads = await db
    .select({ thread: messageThreads, racer: racers })
    .from(messageThreads)
    .innerJoin(racers, eq(messageThreads.racerId, racers.id))
    .where(or(...conditions))
    .orderBy(desc(messageThreads.createdAt));

  return threads;
}

export async function getThreadMessages(threadId: string) {
  return db.select().from(messages).where(eq(messages.threadId, threadId)).orderBy(asc(messages.createdAt));
}
