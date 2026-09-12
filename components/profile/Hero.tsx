import { CountUp } from "@/components/motion/CountUp";
import type { HeadlineStat } from "@/lib/profile/headlineStats";

export function ProfileHero({
  displayName,
  numberDefault,
  classDefault,
  homeTrackName,
  photoUrl,
  fallbackImageUrl,
  headlineStats,
  demoWatermark,
}: {
  displayName: string;
  numberDefault: string | null;
  classDefault: string | null;
  homeTrackName: string | null;
  photoUrl: string | null;
  fallbackImageUrl: string;
  headlineStats: HeadlineStat[];
  demoWatermark?: boolean;
}) {
  return (
    <section className="marble-surface relative overflow-hidden rounded-b-[2rem]">
      {demoWatermark && (
        <div className="absolute top-4 right-4 label-small bg-paper/80 rounded-full px-3 py-1 z-10">
          Fictional demo profile
        </div>
      )}
      <div className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-[1fr_1.2fr] gap-10 items-center">
        <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-mist">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl ?? fallbackImageUrl} alt={displayName} className="w-full h-full object-cover" />
        </div>
        <div>
          {numberDefault && <p className="label-small mb-2">No. {numberDefault}</p>}
          <h1 className="font-display text-5xl mb-3">{displayName}</h1>
          <p className="text-graphite mb-8">{[classDefault, homeTrackName].filter(Boolean).join(" · ")}</p>
          {headlineStats.length > 0 && (
            <div className="flex gap-8">
              {headlineStats.map((stat) => (
                <div key={stat.label}>
                  <CountUp value={stat.value} className="font-display text-3xl" />
                  <p className="text-xs text-graphite">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
