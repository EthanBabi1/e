"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ZoneWithListings {
  zone: { id: string; name: string; tier: string };
  listings: { id: string; priceUsd: number | null; isActive: boolean; guardianApprovedAt: Date | null }[];
  suggestedRange: { min: number; max: number };
}

export function ZonesManager({ zonesWithListings, isMinor }: { zonesWithListings: ZoneWithListings[]; isMinor: boolean }) {
  const router = useRouter();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  async function listZone(zoneId: string) {
    setError(null);
    setWarning(null);
    const priceUsd = Number(prices[zoneId]);
    if (!priceUsd) return;

    const res = await fetch("/api/zones/listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zoneId, listingType: "buy_now", term: "season", priceUsd }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    if (data.warning) setWarning(data.warning);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-accent text-sm">{error}</p>}
      {warning && <p className="text-sm text-graphite bg-marble rounded-lg p-3">{warning}</p>}

      {zonesWithListings.map(({ zone, listings, suggestedRange }) => {
        const activeListing = listings.find((l) => l.isActive || (isMinor && !l.guardianApprovedAt));
        return (
          <div key={zone.id} className="rounded-xl border border-mist p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium">{zone.name}</p>
                <p className="text-xs text-graphite capitalize">{zone.tier}</p>
              </div>
              <p className="text-xs text-silver">
                Suggested ${suggestedRange.min}–${suggestedRange.max}
              </p>
            </div>

            {activeListing ? (
              <p className="text-sm">
                ${activeListing.priceUsd}
                {isMinor && !activeListing.guardianApprovedAt && <span className="text-graphite"> · pending guardian approval</span>}
                {activeListing.isActive && <span className="text-accent"> · live</span>}
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="number"
                  className="border border-mist rounded-lg px-3 py-1.5 text-sm w-28"
                  placeholder={`$${suggestedRange.min}`}
                  value={prices[zone.id] ?? ""}
                  onChange={(e) => setPrices((p) => ({ ...p, [zone.id]: e.target.value }))}
                />
                <button className="rounded-full bg-ink text-paper px-4 py-1.5 text-sm" onClick={() => listZone(zone.id)}>
                  List for sale
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
