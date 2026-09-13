import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { notifications } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { EmptyState } from "@/components/ui/EmptyState";
import { MarkReadButton } from "./MarkReadButton";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/dashboard/notifications");

  const items = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-4xl">Notifications</h1>
        {items.some((n) => !n.readAt) && <MarkReadButton />}
      </div>

      {items.length === 0 ? (
        <EmptyState title="Nothing here yet" body="Results, messages, and sponsorship updates will show up here." />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className={`rounded-lg border p-4 ${n.readAt ? "border-mist" : "border-ink"}`}>
              <p className="text-xs text-graphite uppercase tracking-wide mb-1">{n.category}</p>
              <p className="font-medium">{n.title}</p>
              {n.body && <p className="text-sm text-graphite mt-1">{n.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
