"use client";

import { useState } from "react";

interface Message {
  id: string;
  senderUserId: string;
  body: string;
  createdAt: string | Date;
}

export function ThreadView({
  threadId,
  initialMessages,
  currentUserId,
}: {
  threadId: string;
  initialMessages: Message[];
  currentUserId: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, body: draft }),
      });
      const data = await res.json();
      if (data.status === "blocked_contact_info") {
        setError(data.reason);
        return;
      }
      if (data.status === "rate_limited") {
        setError("You're sending messages too quickly — try again in a few minutes.");
        return;
      }
      setMessages((m) => [...m, { id: data.messageId, senderUserId: currentUserId, body: draft, createdAt: new Date() }]);
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="space-y-3 mb-6">
        {messages.map((m) => (
          <div key={m.id} className={`max-w-[80%] rounded-xl p-3 text-sm ${m.senderUserId === currentUserId ? "bg-ink text-paper ml-auto" : "bg-marble"}`}>
            {m.body}
          </div>
        ))}
      </div>

      {error && <p className="text-accent text-sm mb-3">{error}</p>}

      <div className="flex gap-2">
        <input
          className="flex-1 border border-mist rounded-full px-4 py-2"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && draft.trim() && send()}
          placeholder="Write a message"
        />
        <button className="rounded-full bg-ink text-paper px-5 py-2 text-sm disabled:opacity-40" disabled={sending || !draft.trim()} onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
}
