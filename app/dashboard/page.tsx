import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getManagedRacers } from "@/lib/dashboard/getCurrentRacer";
import { db } from "@/db/client";
import { notifications } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/dashboard");

  const managedRacers = await getManagedRacers(session.user.id);
  const [unreadRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, session.user.id), isNull(notifications.readAt)));

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl mb-8">Dashboard</h1>

      <div className="flex gap-3 mb-10 flex-wrap">
        <Link href="/dashboard/notifications" className="rounded-full bg-marble px-4 py-2 text-sm">
          Notifications{unreadRow.count > 0 && ` (${unreadRow.count})`}
        </Link>
        <Link href="/dashboard/messages" className="rounded-full bg-marble px-4 py-2 text-sm">
          Messages
        </Link>
        <Link href="/dashboard/results/import" className="rounded-full bg-marble px-4 py-2 text-sm">
          Add results
        </Link>
      </div>

      {managedRacers.length === 0 ? (
        <p className="text-graphite">
          No racer profile linked to your account yet. If you have a claim link, open it to connect your profile.
        </p>
      ) : (
        <div className="space-y-3">
          {managedRacers.map((racer) => (
            <div key={racer.id} className="rounded-xl border border-mist p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {racer.firstName} {racer.lastName}
                  {racer.isMinor && <span className="text-xs text-graphite ml-2">(you manage this account)</span>}
                </p>
                <p className="text-xs text-graphite">{racer.classDefault}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/dashboard/profile?racerId=${racer.id}`} className="text-sm accent-underline">
                  Edit profile
                </Link>
                <Link href={`/racers/${racer.slug}`} className="text-sm accent-underline">
                  View public page
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
