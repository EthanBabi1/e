import { getProfileDataBySlug } from "@/lib/profile/getProfileData";
import { RacerProfileView } from "@/components/profile/RacerProfileView";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Demo profile (fictional)",
  robots: { index: false, follow: false }, // a demo page has no reason to rank
};

/**
 * Section 1: "Ship a /demo route with one fully populated fictional
 * racer... before any real one exists." Renders through the exact same
 * component as a real profile — this IS what a finished profile looks
 * like, not a mockup of one.
 */
export default async function DemoPage() {
  const data = await getProfileDataBySlug("demo-jordan-vance");
  if (!data) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-24">
        <EmptyState
          title="Demo profile not seeded yet"
          body="Run `pnpm db:seed` to create the fictional showcase racer this page renders."
        />
      </main>
    );
  }
  return <RacerProfileView data={data} isDemo />;
}
