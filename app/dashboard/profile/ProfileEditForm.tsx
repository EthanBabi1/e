"use client";

import { useState } from "react";

export function ProfileEditForm({
  racerId,
  initial,
}: {
  racerId: string;
  initial: { bio: string | null; story: string | null; seasonGoal: string | null };
}) {
  const [story, setStory] = useState(initial.story ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [seasonGoal, setSeasonGoal] = useState(initial.seasonGoal ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/dashboard/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ racerId, story: story || null, bio: bio || null, seasonGoal: seasonGoal || null }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="label-small block mb-1">Story (a quote or a headline about you)</span>
        <textarea
          className="w-full h-24 border border-mist rounded-lg p-3"
          value={story}
          maxLength={2000}
          onChange={(e) => setStory(e.target.value)}
          placeholder='"I started karting because..."'
        />
      </label>
      <label className="block">
        <span className="label-small block mb-1">Bio</span>
        <textarea className="w-full h-32 border border-mist rounded-lg p-3" value={bio} maxLength={2000} onChange={(e) => setBio(e.target.value)} />
      </label>
      <label className="block">
        <span className="label-small block mb-1">What you&apos;re chasing this season</span>
        <input className="w-full border border-mist rounded-lg px-3 py-2" value={seasonGoal} maxLength={500} onChange={(e) => setSeasonGoal(e.target.value)} />
      </label>
      <button className="rounded-full bg-ink text-paper px-6 py-3 text-sm font-medium disabled:opacity-40" disabled={saving} onClick={save}>
        {saving ? "Saving…" : saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
