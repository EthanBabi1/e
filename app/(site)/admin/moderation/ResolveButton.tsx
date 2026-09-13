"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResolveButton({ kind, id }: { kind: "logo" | "takedown"; id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function resolve(resolution: "resolved" | "rejected") {
    setLoading(true);
    await fetch("/api/admin/moderation/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id, resolution }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex gap-2">
      <button className="text-xs rounded-full bg-ink text-paper px-3 py-1 disabled:opacity-40" disabled={loading} onClick={() => resolve("resolved")}>
        Resolve
      </button>
      <button className="text-xs rounded-full bg-marble px-3 py-1 disabled:opacity-40" disabled={loading} onClick={() => resolve("rejected")}>
        Reject
      </button>
    </div>
  );
}
