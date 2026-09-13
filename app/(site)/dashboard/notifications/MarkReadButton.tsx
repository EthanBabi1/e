"use client";

import { useRouter } from "next/navigation";

export function MarkReadButton() {
  const router = useRouter();
  return (
    <button
      className="text-sm accent-underline"
      onClick={async () => {
        await fetch("/api/dashboard/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        router.refresh();
      }}
    >
      Mark all as read
    </button>
  );
}
