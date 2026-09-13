import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getManagedRacers } from "@/lib/dashboard/getCurrentRacer";
import { db } from "@/db/client";
import { zoneListings, zones } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeSuggestedRange } from "@/lib/pricing/zonePricing";
import { getRacerResults } from "@/lib/telemetry";
import { ZonesManager } from "./ZonesManager";

export const dynamic = "force-dynamic";

export default async function ZonesPage({ searchParams }: { searchParams: Promise<{ racerId?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/dashboard/zones");

  const { racerId } = await searchParams;
  const managed = await getManagedRacers(session.user.id);
  const racer = managed.find((r) => r.id === racerId) ?? managed[0];
  if (!racer) {
    return (
      <main className="max-w-lg mx-auto px-6 py-24 text-center">
        <p className="text-graphite">No racer profile linked to your account yet.</p>
      </main>
    );
  }

  const racerZones = await db.select().from(zones).where(eq(zones.racerId, racer.id));
  const results = await getRacerResults(racer.id);
  const raceCount = results.filter((r) => r.sessionType === "race").length;

  const zonesWithListings = await Promise.all(
    racerZones.map(async (zone) => {
      const listings = await db.select().from(zoneListings).where(eq(zoneListings.zoneId, zone.id));
      const suggestedRange = computeSuggestedRange({ tier: zone.tier, raceCount, audienceFollowing: racer.socialFollowingSelfReported });
      return { zone, listings, suggestedRange };
    })
  );

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl mb-2">Zones</h1>
      {racer.isMinor && (
        <p className="text-sm text-graphite mb-8 rounded-lg bg-marble p-4">
          A guardian must approve each listing before it&apos;s public. You&apos;ll see a pending state until then.
        </p>
      )}
      <ZonesManager zonesWithListings={zonesWithListings} isMinor={racer.isMinor} />
    </main>
  );
}
