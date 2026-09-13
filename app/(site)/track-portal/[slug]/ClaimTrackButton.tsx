"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClaimTrackButton({ trackId }: { trackId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/tracks/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error && <p className="text-accent text-sm mb-3">{error}</p>}
      <button className="rounded-full bg-ink text-paper px-6 py-3 text-sm font-medium disabled:opacity-40" disabled={loading} onClick={claim}>
        {loading ? "Claiming…" : "Claim this track"}
      </button>
    </div>
  );
}
