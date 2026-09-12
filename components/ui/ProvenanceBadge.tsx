const LABELS: Record<string, { label: string; className: string }> = {
  transponder_verified: { label: "Transponder-verified", className: "bg-accent-soft text-accent" },
  track_verified: { label: "Track-verified", className: "bg-marble text-ink" },
  source_linked: { label: "Source-linked", className: "bg-marble text-graphite" },
  self_reported: { label: "Self-reported", className: "bg-marble text-silver" },
};

/** Section 3: "Show the badge everywhere a result appears... make
 * transponder-verified visually distinct enough that racers want it." */
export function ProvenanceBadge({ provenance }: { provenance: string }) {
  const meta = LABELS[provenance] ?? LABELS.self_reported;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase ${meta.className}`}>
      {meta.label}
    </span>
  );
}
