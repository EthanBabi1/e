"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Section 6: "An enquiry form on the profile opens a thread." */
export function EnquiryForm({ racerId, isMinor }: { racerId: string; isMinor: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ racerId, body }),
      });
      if (res.status === 401) {
        router.push("/sign-in");
        return;
      }
      const data = await res.json();
      if (data.result?.status === "blocked_contact_info") {
        setError(data.result.reason);
        return;
      }
      router.push(`/dashboard/messages/${data.threadId}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-mist p-5">
      <p className="label-small mb-3">Ask a question</p>
      {isMinor && <p className="text-xs text-graphite mb-3">This racer is under 18 — your message goes to their guardian, not to them directly.</p>}
      <textarea
        className="w-full h-20 border border-mist rounded-lg p-3 text-sm mb-3"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Ask about sponsorship, availability, or anything else"
      />
      {error && <p className="text-accent text-xs mb-3">{error}</p>}
      <button className="rounded-full bg-ink text-paper px-5 py-2 text-sm disabled:opacity-40" disabled={sending || !body.trim()} onClick={send}>
        {sending ? "Sending…" : "Send"}
      </button>
    </div>
  );
}
