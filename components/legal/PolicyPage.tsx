import type { PolicyDoc } from "@/lib/legal/policyContent";

export function PolicyPage({ policy }: { policy: PolicyDoc }) {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      {policy.needsLegalReview && (
        <div className="rounded-xl bg-accent-soft text-accent text-sm px-4 py-3 mb-8">
          Placeholder: requires legal review before launch. Nothing here should be treated as finalized legal terms.
        </div>
      )}
      <p className="label-small mb-2">Version {policy.version}</p>
      <h1 className="font-display text-4xl mb-8">{policy.title}</h1>
      <div className="prose-legal space-y-4 text-graphite leading-relaxed whitespace-pre-line">
        {policy.body.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </main>
  );
}
