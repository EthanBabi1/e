"use client";

import { useState } from "react";

export interface StorefrontZone {
  listingId: string;
  zoneName: string;
  tier: string;
  priceUsd: number | null;
}

/** Section 4: "If selling, a live '3 zones open' indicator in accent." Only
 * renders when there's something to sell — never an empty storefront
 * module (section 1). */
export function Storefront({ zones }: { zones: StorefrontZone[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (zones.length === 0) return null;

  async function buy(listingId: string) {
    setLoadingId(listingId);
    const res = await fetch("/api/checkout/buy-now", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    if (res.status === 401) {
      window.location.href = "/sign-in";
      return;
    }
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    setLoadingId(null);
  }

  return (
    <section className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-accent inline-block" />
        <p className="label-small">
          {zones.length} zone{zones.length === 1 ? "" : "s"} open
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {zones.map((zone) => (
          <div key={zone.listingId} className="rounded-xl border border-mist p-4">
            <p className="text-xs text-graphite mb-1 capitalize">{zone.tier}</p>
            <p className="font-medium text-sm mb-2">{zone.zoneName}</p>
            {zone.priceUsd != null && <p className="font-display text-lg mb-3">${zone.priceUsd}</p>}
            <button
              className="w-full rounded-full bg-ink text-paper text-xs py-2 disabled:opacity-40"
              disabled={loadingId === zone.listingId}
              onClick={() => buy(zone.listingId)}
            >
              {loadingId === zone.listingId ? "Redirecting…" : "Sponsor this zone"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
