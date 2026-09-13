"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WithdrawalButton({ sponsorshipId }: { sponsorshipId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function execute(mode: "refund" | "credit") {
    setLoading(true);
    const res = await fetch("/api/admin/withdrawals/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sponsorshipId, mode }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setResult(data.error);
      return;
    }
    setResult(`Done — $${data.unservedUsd} ${mode === "refund" ? "refunded" : "credited"}.`);
    router.refresh();
  }

  return (
    <div>
      {result && <p className="text-xs text-graphite mb-2">{result}</p>}
      <div className="flex gap-2">
        <button className="text-xs rounded-full bg-ink text-paper px-3 py-1 disabled:opacity-40" disabled={loading} onClick={() => execute("refund")}>
          Process pro-rata refund
        </button>
        <button className="text-xs rounded-full bg-marble px-3 py-1 disabled:opacity-40" disabled={loading} onClick={() => execute("credit")}>
          Issue sponsor credit instead
        </button>
      </div>
    </div>
  );
}
