"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Sponsorship {
  id: string;
  status: string;
  amountUsd: number;
  racerNetUsd: number;
}

const STATUS_LABEL: Record<string, string> = {
  pending_guardian_approval: "Waiting on guardian approval",
  charged_pending_decal: "Waiting on decal photo",
  awaiting_sponsor_confirmation: "Waiting on sponsor confirmation",
  released: "Released",
  disputed: "Disputed",
  refunded: "Refunded",
  withdrawn: "Withdrawn",
};

export function SponsorshipCard({ sponsorship, racerName, isSponsor }: { sponsorship: Sponsorship; racerName: string; isSponsor: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(url: string, body: object) {
    setLoading(true);
    setError(null);
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    router.refresh();
  }

  async function uploadDecal(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      await post("/api/sponsorships/decal", { sponsorshipId: sponsorship.id, imageBase64: base64 });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="rounded-xl border border-mist p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium">{racerName}</p>
        <p className="font-mono-tabular text-sm">${sponsorship.amountUsd}</p>
      </div>
      <p className="text-xs text-graphite mb-3">{STATUS_LABEL[sponsorship.status] ?? sponsorship.status}</p>
      {error && <p className="text-accent text-xs mb-2">{error}</p>}

      {!isSponsor && sponsorship.status === "pending_guardian_approval" && (
        <button className="rounded-full bg-ink text-paper px-4 py-1.5 text-sm disabled:opacity-40" disabled={loading} onClick={() => post("/api/sponsorships/approve", { sponsorshipId: sponsorship.id })}>
          Approve this sponsor
        </button>
      )}

      {!isSponsor && sponsorship.status === "charged_pending_decal" && (
        <label className="inline-block rounded-full bg-ink text-paper px-4 py-1.5 text-sm cursor-pointer">
          Upload decal photo
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadDecal(e.target.files[0])} />
        </label>
      )}

      {isSponsor && sponsorship.status === "awaiting_sponsor_confirmation" && (
        <button className="rounded-full bg-ink text-paper px-4 py-1.5 text-sm disabled:opacity-40" disabled={loading} onClick={() => post("/api/sponsorships/confirm", { sponsorshipId: sponsorship.id })}>
          Confirm decal is on the kart
        </button>
      )}
    </div>
  );
}
