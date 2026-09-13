"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateSeriesSponsorshipForm({ seriesOptions }: { seriesOptions: { id: string; name: string; classes: string[] }[] }) {
  const router = useRouter();
  const [seriesId, setSeriesId] = useState(seriesOptions[0]?.id ?? "");
  const [className, setClassName] = useState("");
  const [sponsorOrgName, setSponsorOrgName] = useState("");
  const [rateUsd, setRateUsd] = useState("");
  const [splitPlatformPct, setSplitPlatformPct] = useState("15");
  const [splitTrackPct, setSplitTrackPct] = useState("15");
  const [splitRacersPct, setSplitRacersPct] = useState("70");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    await fetch("/api/admin/series-sponsorships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seriesId,
        className: className || null,
        sponsorOrgName,
        rateUsd: Number(rateUsd),
        splitPlatformPct: Number(splitPlatformPct),
        splitTrackPct: Number(splitTrackPct),
        splitRacersPct: Number(splitRacersPct),
      }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-xl border border-mist p-4">
      <select className="w-full border border-mist rounded-lg px-3 py-2 text-sm" value={seriesId} onChange={(e) => setSeriesId(e.target.value)}>
        {seriesOptions.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <input className="w-full border border-mist rounded-lg px-3 py-2 text-sm" placeholder="Class (blank = whole series)" value={className} onChange={(e) => setClassName(e.target.value)} />
      <input className="w-full border border-mist rounded-lg px-3 py-2 text-sm" placeholder="Sponsor org name" value={sponsorOrgName} onChange={(e) => setSponsorOrgName(e.target.value)} />
      <input className="w-full border border-mist rounded-lg px-3 py-2 text-sm" placeholder="Rate (USD)" type="number" value={rateUsd} onChange={(e) => setRateUsd(e.target.value)} />
      <div className="flex gap-2">
        <input className="w-full border border-mist rounded-lg px-3 py-2 text-sm" placeholder="Platform %" type="number" value={splitPlatformPct} onChange={(e) => setSplitPlatformPct(e.target.value)} />
        <input className="w-full border border-mist rounded-lg px-3 py-2 text-sm" placeholder="Track %" type="number" value={splitTrackPct} onChange={(e) => setSplitTrackPct(e.target.value)} />
        <input className="w-full border border-mist rounded-lg px-3 py-2 text-sm" placeholder="Racers %" type="number" value={splitRacersPct} onChange={(e) => setSplitRacersPct(e.target.value)} />
      </div>
      <button className="rounded-full bg-ink text-paper px-4 py-2 text-sm disabled:opacity-40" disabled={loading || !sponsorOrgName || !rateUsd} onClick={submit}>
        {loading ? "Creating…" : "Create deal"}
      </button>
    </div>
  );
}
