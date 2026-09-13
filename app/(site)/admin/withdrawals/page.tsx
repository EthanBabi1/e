import { eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { db } from "@/db/client";
import { racers, sponsorships } from "@/db/schema";
import { EmptyState } from "@/components/ui/EmptyState";
import { WithdrawalButton } from "./WithdrawalButton";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["pending_guardian_approval", "charged_pending_decal", "awaiting_sponsor_confirmation", "released"] as const;

export default async function WithdrawalsAdminPage() {
  await requireAdmin();

  const active = await db.select().from(sponsorships).where(inArray(sponsorships.status, [...ACTIVE_STATUSES]));
  const withRacers = await Promise.all(
    active.map(async (s) => {
      const [racer] = await db.select().from(racers).where(eq(racers.id, s.racerId));
      return { sponsorship: s, racer };
    })
  );

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl mb-2">Withdrawals</h1>
      <p className="text-graphite mb-8 text-sm">
        Section 6&apos;s default policy: pro-rata refund of the unserved term, or a sponsor credit — the sponsor&apos;s choice.
      </p>
      {withRacers.length === 0 ? (
        <EmptyState title="No active sponsorships to withdraw" />
      ) : (
        <div className="space-y-3">
          {withRacers.map(({ sponsorship, racer }) => (
            <div key={sponsorship.id} className="rounded-lg border border-mist p-4">
              <p className="text-sm font-medium">
                {racer?.firstName} {racer?.lastName} — ${sponsorship.amountUsd}
              </p>
              <p className="text-xs text-graphite mb-2">{sponsorship.status}</p>
              <WithdrawalButton sponsorshipId={sponsorship.id} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
