"use client";

import { useState } from "react";

export function SetupPayoutsButton() {
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    const res = await fetch("/api/stripe/connect/onboard", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    setLoading(false);
  }

  return (
    <button className="text-sm accent-underline mb-10 block" disabled={loading} onClick={start}>
      {loading ? "Setting up…" : "Set up payouts (Stripe Connect)"}
    </button>
  );
}
