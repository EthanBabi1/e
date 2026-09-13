"use client";

import { useState } from "react";

/** Section 3: public, no account, no argument. */
export default function RemovePage() {
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    await fetch("/api/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ racerSlugOrName: slug, requestedByEmail: email, reason: reason || undefined }),
    });
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="max-w-md mx-auto px-6 py-24 text-center">
        <p className="font-display text-2xl mb-2">Request received</p>
        <p className="text-graphite">We&apos;ll act on this within 48 hours.</p>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-6 py-24">
      <h1 className="font-display text-3xl mb-2">Request a profile be removed</h1>
      <p className="text-graphite mb-8 text-sm">
        For an unclaimed profile you don&apos;t control — no account needed, no explanation required. We honor these within 48 hours.
      </p>
      <div className="space-y-4">
        <input
          className="w-full border border-mist rounded-lg px-4 py-3"
          placeholder="Racer's profile URL or name"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <input
          className="w-full border border-mist rounded-lg px-4 py-3"
          placeholder="Your email (so we can confirm with you)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <textarea
          className="w-full h-20 border border-mist rounded-lg p-3"
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button
          className="rounded-full bg-ink text-paper px-6 py-3 text-sm font-medium disabled:opacity-40"
          disabled={loading || !slug || !email}
          onClick={submit}
        >
          {loading ? "Submitting…" : "Submit request"}
        </button>
      </div>
    </main>
  );
}
