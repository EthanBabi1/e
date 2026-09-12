import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { events, raceSessions } from "@/db/schema";

/** Find-or-create the event + race_session a batch of results belongs to.
 * Every ingest path (B/C/D) asks the uploader for track+date+class+session
 * type up front, then routes rows into this session. */
export async function findOrCreateEventSession(params: {
  trackId: string;
  eventName: string;
  eventDate: string;
  sessionType: "practice" | "qualifying" | "race";
  className: string;
}) {
  let [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.trackId, params.trackId), eq(events.date, params.eventDate)));

  if (!event) {
    [event] = await db
      .insert(events)
      .values({ trackId: params.trackId, name: params.eventName, date: params.eventDate, isFictionalDemo: false })
      .returning();
  }

  let [session] = await db
    .select()
    .from(raceSessions)
    .where(
      and(
        eq(raceSessions.eventId, event.id),
        eq(raceSessions.type, params.sessionType),
        eq(raceSessions.className, params.className)
      )
    );

  if (!session) {
    [session] = await db
      .insert(raceSessions)
      .values({ eventId: event.id, type: params.sessionType, className: params.className })
      .returning();
  }

  return { event, session };
}
