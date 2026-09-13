import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getOpenModerationQueue } from "@/lib/admin/moderation";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResolveButton } from "./ResolveButton";

export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  await requireAdmin();
  const { logos, takedowns } = await getOpenModerationQueue();

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl mb-8">Moderation queue</h1>

      <section className="mb-10">
        <p className="label-small mb-3">Takedown requests (section 3, 48 hour SLA)</p>
        {takedowns.length === 0 ? (
          <EmptyState title="No open takedown requests" />
        ) : (
          <div className="space-y-3">
            {takedowns.map((t) => (
              <div key={t.id} className="rounded-lg border border-mist p-4">
                <p className="text-sm font-medium">{t.requestedByEmail}</p>
                <p className="text-xs text-graphite mb-2">{t.reason ?? "No reason given"}</p>
                <ResolveButton kind="takedown" id={t.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="label-small mb-3">Logo reports (section 6)</p>
        {logos.length === 0 ? (
          <EmptyState title="No open logo reports" />
        ) : (
          <div className="space-y-3">
            {logos.map((l) => (
              <div key={l.id} className="rounded-lg border border-mist p-4">
                <p className="text-sm font-medium">{l.targetType}: {l.targetId}</p>
                <p className="text-xs text-graphite mb-2">{l.reason}</p>
                <ResolveButton kind="logo" id={l.id} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
