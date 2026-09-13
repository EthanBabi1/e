"use client";

import { useState } from "react";

export function UpgradeButton() {
  const [loading, setLoading] = useState(false);

  async function upgrade() {
    setLoading(true);
    const res = await fetch("/api/subscription/upgrade", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    setLoading(false);
  }

  return (
    <button className="rounded-full bg-ink text-paper px-6 py-3 text-sm font-medium disabled:opacity-40" disabled={loading} onClick={upgrade}>
      {loading ? "Redirecting to checkout…" : "Upgrade to Pro"}
    </button>
  );
}
