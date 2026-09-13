import { requireAdmin } from "@/lib/admin/requireAdmin";
import { db } from "@/db/client";
import { series, seriesSponsorships } from "@/db/schema";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreateSeriesSponsorshipForm } from "./CreateSeriesSponsorshipForm";

export const dynamic = "force-dynamic";

export default async function SeriesSponsorshipsAdminPage() {
  await requireAdmin();

  const allSeries = await db.select().from(series);
  const deals = await db.select().from(seriesSponsorships);

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl mb-2">Series sponsorships</h1>
      <p className="text-graphite mb-8 text-sm">
        Section 7&apos;s biggest-ticket line — naming rights on a championship or class. Admin-created manually in v1, no self-serve checkout yet.
      </p>

      <CreateSeriesSponsorshipForm seriesOptions={allSeries.map((s) => ({ id: s.id, name: s.name, classes: s.classes as string[] }))} />

      <div className="mt-10">
        <p className="label-small mb-3">Existing deals</p>
        {deals.length === 0 ? (
          <EmptyState title="No series sponsorships sold yet" />
        ) : (
          <div className="space-y-2">
            {deals.map((d) => (
              <div key={d.id} className="rounded-lg border border-mist p-3 text-sm">
                {d.sponsorOrgName} — ${d.rateUsd} — {d.className ?? "whole series"} — {d.status}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
