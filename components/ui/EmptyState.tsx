/**
 * The one designed presentation for "nothing here yet" anywhere in the app.
 * Per DESIGN.md: never a bare "no data available" string, never an empty
 * chart or header-only table. A module with truly nothing to show should
 * return null from its parent instead of rendering this — this component is
 * for the cases with SOME framing to offer (curation, not absence).
 */
export function EmptyState({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="marble-surface rounded-2xl border border-mist px-8 py-12 text-center">
      {eyebrow && <p className="label-small mb-3">{eyebrow}</p>}
      <p className="font-display text-2xl text-ink mb-2">{title}</p>
      {body && <p className="text-graphite max-w-md mx-auto">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
