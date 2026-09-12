import Link from "next/link";
import { getActiveListings } from "@/lib/marketplace/getListings";
import { EmptyState } from "@/components/ui/EmptyState";
import { CONFIG } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Sponsor a racer | ${CONFIG.platformName}`,
  description: "Browse verified racers with open sponsorship zones near you.",
};

export default async function MarketplacePage() {
  const listings = await getActiveListings();

  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <p className="label-small mb-2">Marketplace</p>
      <h1 className="font-display text-4xl mb-2">Sponsor a racer near you</h1>
      <p className="text-graphite mb-10 max-w-xl">
        Every listing here is backed by a verified racer record — not a self-reported claim.
      </p>

      {listings.length === 0 ? (
        <EmptyState
          eyebrow={CONFIG.launchTrack}
          title={`The first racers at ${CONFIG.launchTrack}`}
          body="Nobody has listed a zone here yet — the first racer to list one gets first pick of visibility."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {listings.map((listing) => (
            <Link
              key={listing.listingId}
              href={`/racers/${listing.racer.slug}`}
              className="rounded-xl border border-mist p-5 hover:border-ink transition-colors block"
            >
              <p className="label-small mb-1">{listing.zoneName}</p>
              <p className="font-medium mb-1">{listing.racer.displayName}</p>
              <p className="text-xs text-graphite mb-3">
                {[listing.racer.classDefault, listing.trackName].filter(Boolean).join(" · ")}
              </p>
              {listing.priceUsd != null && <p className="font-display text-xl">${listing.priceUsd}</p>}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
