"use client";

import { useState } from "react";

interface Result {
  user: { id: string; email: string; role: string };
  managedRacers: { id: string; slug: string; name: string }[];
  sponsorshipCount: number;
}

export function ImpersonateSearch() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error);
      setResult(null);
      return;
    }
    setResult(data);
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <input
          className="flex-1 border border-mist rounded-lg px-4 py-2"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="rounded-full bg-ink text-paper px-5 py-2 text-sm disabled:opacity-40" disabled={loading || !email} onClick={search}>
          Look up
        </button>
      </div>
      {error && <p className="text-accent text-sm">{error}</p>}
      {result && (
        <div className="rounded-xl border border-mist p-4 text-sm space-y-2">
          <p><span className="text-graphite">Role:</span> {result.user.role}</p>
          <p><span className="text-graphite">Managed racers:</span> {result.managedRacers.map((r) => r.name).join(", ") || "none"}</p>
          <p><span className="text-graphite">Sponsorships:</span> {result.sponsorshipCount}</p>
        </div>
      )}
    </div>
  );
}
