"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MINOR_DISPLAY_CONSENT } from "@/lib/legal/policyContent";

export function ClaimForm({
  token,
  racer,
}: {
  token: string;
  racer: { id: string; firstName: string; lastName: string; isMinor: boolean };
}) {
  const router = useRouter();
  const [relationship, setRelationship] = useState("parent");
  const [consented, setConsented] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ racerId: racer.id, token, relationship: racer.isMinor ? relationship : undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="max-w-md mx-auto px-6 py-24 text-center">
        <p className="font-display text-2xl mb-2">Profile claimed</p>
        <p className="text-graphite">Taking you to your dashboard…</p>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-6 py-24">
      <h1 className="font-display text-3xl mb-2">
        Claim {racer.firstName} {racer.lastName}&apos;s profile
      </h1>
      <p className="text-graphite mb-8">
        {racer.isMinor
          ? "Since this racer is under 18, you're claiming this as their parent or guardian — you become the account holder, not them."
          : "This will link this profile to your account."}
      </p>

      {racer.isMinor && (
        <>
          <label className="block mb-4">
            <span className="label-small block mb-1">Your relationship to the racer</span>
            <select className="w-full border border-mist rounded-lg px-3 py-2" value={relationship} onChange={(e) => setRelationship(e.target.value)}>
              <option value="parent">Parent</option>
              <option value="legal_guardian">Legal guardian</option>
            </select>
          </label>
          <label className="flex items-start gap-3 mb-8 text-sm text-graphite">
            <input type="checkbox" className="mt-1" checked={consented} onChange={(e) => setConsented(e.target.checked)} />
            <span>{MINOR_DISPLAY_CONSENT.body}</span>
          </label>
        </>
      )}

      {error && <p className="text-accent text-sm mb-4">{error}</p>}

      <button
        className="rounded-full bg-ink text-paper px-6 py-3 text-sm font-medium disabled:opacity-40"
        disabled={loading || (racer.isMinor && !consented)}
        onClick={submit}
      >
        {loading ? "Claiming…" : "Claim this profile"}
      </button>
    </main>
  );
}
