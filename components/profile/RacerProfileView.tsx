import { ProfileHero } from "./Hero";
import { Story } from "./Story";
import { RecordTable, FormGuideStrip } from "./RecordTable";
import { TelemetryChart } from "./TelemetryChart";
import { PublicRatingSection } from "./RatingSection";
import { Storefront } from "./Storefront";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ProfileData } from "@/lib/profile/getProfileData";
import { CONFIG } from "@/lib/config";

export function RacerProfileView({ data, isDemo }: { data: ProfileData; isDemo?: boolean }) {
  const { view, results, headlineStats, homeTrackName, rating, laps, classMedianMs, consistencyMs, openZones } = data;

  const hasAnyResults = results.length > 0;

  return (
    <main>
      <ProfileHero
        displayName={view.displayName}
        numberDefault={view.numberDefault}
        classDefault={view.classDefault}
        homeTrackName={homeTrackName}
        photoUrl={view.photoUrl}
        fallbackImageUrl={`/api/images/fallback/${view.id}`}
        headlineStats={headlineStats}
        demoWatermark={isDemo}
      />

      <Story bio={view.bio} story={view.story} />

      <Storefront zones={openZones} />

      {rating && (
        <div className="max-w-5xl mx-auto px-6 pt-4">
          <PublicRatingSection isProvisional={rating.isProvisional} mu={rating.mu} sigma={rating.sigma} className={rating.className} />
        </div>
      )}

      {!hasAnyResults ? (
        <div className="max-w-5xl mx-auto px-6 py-12">
          <EmptyState
            title={`${view.displayName.split(" ")[0]}'s results will show up here`}
            body={`Once ${CONFIG.platformName} verifies a result for this racer, it appears here automatically.`}
          />
        </div>
      ) : (
        <>
          <div className="max-w-5xl mx-auto px-6 pt-8">
            <FormGuideStrip results={results} />
          </div>
          <RecordTable results={results} />
          {laps.length >= 3 && (
            <section className="max-w-5xl mx-auto px-6 py-12">
              <p className="label-small mb-4">Pace at {homeTrackName}</p>
              <TelemetryChart laps={laps} classMedianMs={classMedianMs} />
              {consistencyMs != null && (
                <p className="text-sm text-graphite mt-3">
                  Consistency (last race): <span className="font-mono-tabular text-ink">±{(consistencyMs / 1000).toFixed(3)}s</span> lap-to-lap
                </p>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
