import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getThreadsForUser } from "@/lib/messaging/inbox";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function MessagesInboxPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/dashboard/messages");

  const threads = await getThreadsForUser(session.user.id);

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl mb-8">Messages</h1>
      {threads.length === 0 ? (
        <EmptyState title="No messages yet" body="Enquiries from sponsors show up here." />
      ) : (
        <ul className="space-y-2">
          {threads.map(({ thread, racer }) => (
            <li key={thread.id}>
              <Link href={`/dashboard/messages/${thread.id}`} className="block rounded-lg border border-mist p-4 hover:border-ink transition-colors">
                <p className="font-medium">
                  {racer.firstName} {racer.lastName}
                  {thread.guardianUserId && <span className="text-xs text-graphite ml-2">(routed to guardian, minor racer)</span>}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
