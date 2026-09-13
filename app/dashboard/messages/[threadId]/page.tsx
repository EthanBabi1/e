import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { messageThreads, racers } from "@/db/schema";
import { getThreadMessages } from "@/lib/messaging/inbox";
import { isMinorThread } from "@/lib/messaging/threads";
import { ThreadView } from "./ThreadView";

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { threadId } = await params;
  const [thread] = await db.select().from(messageThreads).where(eq(messageThreads.id, threadId));
  if (!thread) notFound();

  const isParticipant = [thread.sponsorUserId, thread.guardianUserId].includes(session.user.id);
  if (!isParticipant) notFound();

  const [racer] = await db.select().from(racers).where(eq(racers.id, thread.racerId));
  const messageRows = await getThreadMessages(threadId);

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <p className="label-small mb-2">
        Thread with {racer?.firstName} {racer?.lastName}
      </p>
      {isMinorThread(thread) && (
        <div className="rounded-lg bg-marble text-sm p-3 mb-6">
          This racer is under 18 — this thread goes to their guardian, not the racer directly. Admin can review threads involving a minor.
        </div>
      )}
      <ThreadView threadId={threadId} initialMessages={messageRows} currentUserId={session.user.id} />
    </main>
  );
}
