import { CountUp } from "@/components/motion/CountUp";
import { EmptyState } from "@/components/ui/EmptyState";
import { MagneticButton } from "@/components/motion/MagneticButton";

const swatches = [
  { name: "--paper", value: "#FAFAF8" },
  { name: "--marble", value: "#F2F0EC" },
  { name: "--mist", value: "#E6E4DF" },
  { name: "--ink", value: "#0A0A0B" },
  { name: "--graphite", value: "#5A5A5E" },
  { name: "--silver", value: "#B8B5AE" },
  { name: "--accent", value: "#C8102E" },
  { name: "--accent-soft", value: "#FDF2F3" },
];

export default function StylePage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-16 space-y-20">
      <header>
        <p className="label-small mb-2">Design system — Phase 0 deliverable</p>
        <h1 className="font-display text-5xl mb-3">Podium Row style tile</h1>
        <p className="text-graphite max-w-xl">
          Rendered tokens, type scale and motion primitives from DESIGN.md. This
          page is a working reference, not marketing — see it as a QA surface
          for the aesthetic rules in the brief&apos;s section 1.
        </p>
      </header>

      <section>
        <h2 className="label-small mb-4">Palette</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {swatches.map((s) => (
            <div key={s.name} className="rounded-xl overflow-hidden border border-mist">
              <div className="h-20" style={{ background: s.value }} />
              <div className="p-3">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-silver">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-graphite mt-3">
          Rule: if more than ~2% of a viewport is accent red, it&apos;s wrong.
        </p>
      </section>

      <section>
        <h2 className="label-small mb-4">Type</h2>
        <p className="font-display text-6xl mb-4">Grid to green</p>
        <p className="text-lg text-graphite max-w-xl mb-4">
          Interface text runs on Inter. Numbers stay tabular everywhere they
          change: <span className="font-mono-tabular text-ink">1:02.451</span>
        </p>
        <p className="label-small">Small-caps metadata label</p>
      </section>

      <section>
        <h2 className="label-small mb-4">Motion — count-up (fires once, in view)</h2>
        <div className="flex gap-10">
          <div>
            <CountUp value={34} className="font-display text-4xl" />
            <p className="text-sm text-graphite">sessions this season</p>
          </div>
          <div>
            <CountUp value={1420} className="font-display text-4xl" />
            <p className="text-sm text-graphite">provisional rating</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="label-small mb-4">Motion — magnetic CTA</h2>
        <MagneticButton>View racer profile</MagneticButton>
      </section>

      <section>
        <h2 className="label-small mb-4">Glass card on marble</h2>
        <div className="marble-surface rounded-2xl p-10">
          <div className="glass rounded-xl p-6 max-w-sm">
            <p className="label-small mb-2">Zone — Nose Cone</p>
            <p className="font-display text-2xl">$180 buy now</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="label-small mb-4">Empty state (designed, never a bare string)</h2>
        <EmptyState
          eyebrow="Marketplace"
          title="The first racers at Millhaven Kart Club"
          body="Nobody has listed a zone here yet — you'd be the first name on this page."
          action={<MagneticButton>List your kart</MagneticButton>}
        />
      </section>
    </main>
  );
}
