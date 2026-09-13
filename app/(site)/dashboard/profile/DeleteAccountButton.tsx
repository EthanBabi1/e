"use client";

import { useState } from "react";

export function DeleteAccountButton({ racerId, isMinor }: { racerId: string; isMinor: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<{ immediate: boolean } | null>(null);

  async function execute() {
    const res = await fetch("/api/accounts/deletion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ racerId }),
    });
    const data = await res.json();
    setDone(data);
  }

  if (done) {
    return (
      <p className="text-sm text-graphite mt-8">
        {done.immediate
          ? "Deleted immediately, in full."
          : "Deletion requested: this profile is suspended now and will be permanently purged in 90 days unless you contact us to restore it."}
      </p>
    );
  }

  return (
    <div className="mt-8">
      {!confirming ? (
        <button className="text-xs text-graphite underline" onClick={() => setConfirming(true)}>
          Delete this profile
        </button>
      ) : (
        <div className="rounded-lg bg-accent-soft p-4 text-sm">
          <p className="mb-3">
            {isMinor
              ? "This deletes this profile immediately and completely: results, story, photo, messages. This cannot be undone."
              : "This suspends the profile now; it's fully purged after 90 days unless restored. Results, story, photo, and messages are all included."}
          </p>
          <div className="flex gap-2">
            <button className="rounded-full bg-accent text-paper px-4 py-1.5 text-xs" onClick={execute}>
              Yes, delete
            </button>
            <button className="rounded-full bg-marble px-4 py-1.5 text-xs" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
