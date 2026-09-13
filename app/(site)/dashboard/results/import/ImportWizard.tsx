"use client";

import { useEffect, useState } from "react";

interface Track {
  id: string;
  name: string;
}

interface ManualRow {
  position: string;
  kartNumber: string;
  driverName: string;
  laps: string;
  bestLap: string;
  totalTime: string;
  gap: string;
  status: "finished" | "dnf" | "dns" | "dq";
}

interface DraftRowResult {
  resultId: string;
  driverNameRaw: string | null;
  match: { candidates: { racerId: string; displayName: string; confidence: number; reasons: string[] }[]; autoLink: { racerId: string; displayName: string } | null };
  issues: { field: string; message: string; severity: "warn" | "block" }[];
  lowConfidenceFields: string[];
}

const EMPTY_ROW: ManualRow = { position: "", kartNumber: "", driverName: "", laps: "", bestLap: "", totalTime: "", gap: "", status: "finished" };

export function ImportWizard({ tracks }: { tracks: Track[] }) {
  const [method, setMethod] = useState<"manual" | "csv" | "photo" | "mylaps">("manual");
  const [mylapsEnabled, setMylapsEnabled] = useState(false);
  const [trackId, setTrackId] = useState(tracks[0]?.id ?? "");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [sessionType, setSessionType] = useState<"practice" | "qualifying" | "race">("race");
  const [className, setClassName] = useState("");

  const [manualRows, setManualRows] = useState<ManualRow[]>(Array.from({ length: 6 }, () => ({ ...EMPTY_ROW })));
  const [csvText, setCsvText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [batch, setBatch] = useState<{ batchId: string; rows: DraftRowResult[] } | null>(null);
  const [decisions, setDecisions] = useState<Record<string, string>>({}); // resultId -> racerId or "__new__"
  const [publishResult, setPublishResult] = useState<{ published: number; ghostsCreated: number } | null>(null);

  useEffect(() => {
    fetch("/api/config/flags")
      .then((r) => r.json())
      .then((flags) => setMylapsEnabled(!!flags.mylapsImport))
      .catch(() => {});
  }, []);

  const context = { trackId, eventName, eventDate, sessionType, className };
  const contextComplete = trackId && eventName && eventDate && className;

  async function submitManual() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ingest/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...context, rows: manualRows.filter((r) => r.driverName.trim() !== "") }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Import failed");
      setBatch(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  async function submitCsv() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ingest/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...context, csvText }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Import failed");
      setBatch(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  async function submitPhoto(file: File) {
    setLoading(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/ingest/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...context,
          images: [base64],
          mediaType: file.type || "image/jpeg",
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Extraction failed");
      }
      setBatch(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setLoading(false);
    }
  }

  async function publish() {
    if (!batch) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ingest/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: batch.batchId,
          decisions: batch.rows.map((r) => ({
            resultId: r.resultId,
            racerId: decisions[r.resultId] && decisions[r.resultId] !== "__new__" ? decisions[r.resultId] : null,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Publish failed");
      setPublishResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setLoading(false);
    }
  }

  if (publishResult) {
    return (
      <div className="marble-surface rounded-2xl p-10 text-center">
        <p className="font-display text-2xl mb-2">Published</p>
        <p className="text-graphite">
          {publishResult.published} result{publishResult.published === 1 ? "" : "s"} added
          {publishResult.ghostsCreated > 0 && `, ${publishResult.ghostsCreated} new profile${publishResult.ghostsCreated === 1 ? "" : "s"} created`}.
        </p>
      </div>
    );
  }

  if (batch) {
    const hasBlocking = batch.rows.some((r) => r.issues.some((i) => i.severity === "block"));
    return (
      <div>
        <h2 className="font-display text-2xl mb-4">Review before publishing</h2>
        <div className="space-y-4">
          {batch.rows.map((row) => (
            <div key={row.resultId} className="border border-mist rounded-xl p-4">
              <p className="font-medium mb-2">{row.driverNameRaw ?? "(no name parsed)"}</p>
              {row.lowConfidenceFields.length > 0 && (
                <p className="text-xs text-accent mb-2">Low confidence: {row.lowConfidenceFields.join(", ")}</p>
              )}
              {row.issues.map((issue, i) => (
                <p key={i} className={`text-xs mb-1 ${issue.severity === "block" ? "text-accent font-medium" : "text-graphite"}`}>
                  {issue.severity === "block" ? "⚠ " : "note: "}
                  {issue.message}
                </p>
              ))}
              <select
                className="border border-mist rounded-lg px-3 py-1.5 text-sm mt-2"
                value={decisions[row.resultId] ?? (row.match.autoLink ? row.match.autoLink.racerId : "__new__")}
                onChange={(e) => setDecisions((d) => ({ ...d, [row.resultId]: e.target.value }))}
              >
                <option value="__new__">Create new profile</option>
                {row.match.candidates.map((c) => (
                  <option key={c.racerId} value={c.racerId}>
                    Link to {c.displayName} ({Math.round(c.confidence * 100)}% match)
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        {error && <p className="text-accent text-sm mt-4">{error}</p>}
        <button
          className="mt-6 rounded-full bg-ink text-paper px-6 py-3 text-sm font-medium disabled:opacity-40"
          disabled={hasBlocking || loading}
          onClick={publish}
        >
          {hasBlocking ? "Resolve blocking issues first" : loading ? "Publishing…" : `Publish ${batch.rows.length} results`}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Track">
          <select className="w-full border border-mist rounded-lg px-3 py-2" value={trackId} onChange={(e) => setTrackId(e.target.value)}>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Class">
          <input className="w-full border border-mist rounded-lg px-3 py-2" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Junior Sportsman" />
        </Field>
        <Field label="Event name">
          <input className="w-full border border-mist rounded-lg px-3 py-2" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Round 6" />
        </Field>
        <Field label="Date">
          <input type="date" className="w-full border border-mist rounded-lg px-3 py-2" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </Field>
        <Field label="Session">
          <select className="w-full border border-mist rounded-lg px-3 py-2" value={sessionType} onChange={(e) => setSessionType(e.target.value as typeof sessionType)}>
            <option value="race">Race</option>
            <option value="qualifying">Qualifying</option>
            <option value="practice">Practice</option>
          </select>
        </Field>
      </div>

      <div className="flex gap-2 border-b border-mist pb-4">
        {(["manual", "csv", "photo", "mylaps"] as const).map((m) => (
          <button
            key={m}
            className={`px-4 py-2 rounded-full text-sm ${method === m ? "bg-ink text-paper" : "bg-marble text-graphite"}`}
            onClick={() => setMethod(m)}
          >
            {m === "manual" && "Type it in"}
            {m === "csv" && "Paste / CSV"}
            {m === "photo" && "Photo of sheet"}
            {m === "mylaps" && "MYLAPS transponder"}
          </button>
        ))}
      </div>

      {method === "manual" && (
        <div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left label-small">
                  <th className="pb-2">Pos</th>
                  <th>Kart</th>
                  <th>Driver</th>
                  <th>Laps</th>
                  <th>Best lap</th>
                  <th>Total time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {manualRows.map((row, i) => (
                  <tr key={i}>
                    {(["position", "kartNumber", "driverName", "laps", "bestLap", "totalTime"] as const).map((field) => (
                      <td key={field} className="pr-2 py-1">
                        <input
                          className="w-full border border-mist rounded px-2 py-1"
                          value={row[field]}
                          onChange={(e) => {
                            const next = [...manualRows];
                            next[i] = { ...next[i], [field]: e.target.value };
                            setManualRows(next);
                          }}
                        />
                      </td>
                    ))}
                    <td>
                      <select
                        className="border border-mist rounded px-2 py-1"
                        value={row.status}
                        onChange={(e) => {
                          const next = [...manualRows];
                          next[i] = { ...next[i], status: e.target.value as ManualRow["status"] };
                          setManualRows(next);
                        }}
                      >
                        <option value="finished">Finished</option>
                        <option value="dnf">DNF</option>
                        <option value="dns">DNS</option>
                        <option value="dq">DQ</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="text-sm accent-underline mt-2" onClick={() => setManualRows((r) => [...r, { ...EMPTY_ROW }])}>
            + add row
          </button>
          <div className="mt-4">
            <button
              className="rounded-full bg-ink text-paper px-6 py-3 text-sm font-medium disabled:opacity-40"
              disabled={!contextComplete || loading}
              onClick={submitManual}
            >
              {loading ? "Submitting…" : "Continue to review"}
            </button>
          </div>
        </div>
      )}

      {method === "csv" && (
        <div>
          <textarea
            className="w-full h-48 border border-mist rounded-lg p-3 font-mono-tabular text-sm"
            placeholder="Paste CSV or a spreadsheet block here"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
          <button
            className="mt-4 rounded-full bg-ink text-paper px-6 py-3 text-sm font-medium disabled:opacity-40"
            disabled={!contextComplete || !csvText.trim() || loading}
            onClick={submitCsv}
          >
            {loading ? "Parsing…" : "Continue to review"}
          </button>
        </div>
      )}

      {method === "photo" && (
        <div>
          <p className="text-sm text-graphite mb-3">A phone photo, screenshot, or PDF of the results sheet.</p>
          <input
            type="file"
            accept="image/*,application/pdf"
            disabled={!contextComplete || loading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) submitPhoto(file);
            }}
          />
          {loading && <p className="text-sm text-graphite mt-2">Reading the sheet…</p>}
        </div>
      )}

      {method === "mylaps" && (
        <div className="marble-surface rounded-xl p-6">
          {mylapsEnabled ? (
            <p className="text-sm text-graphite">MYLAPS import is enabled — enter your transponder number on your dashboard&apos;s sync settings.</p>
          ) : (
            <p className="text-sm text-graphite">
              MYLAPS transponder import isn&apos;t turned on for this platform yet (see <code>DATA-ACCESS.md</code>) — use a photo, CSV, or
              manual entry instead for now.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-accent text-sm">{error}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-small block mb-1">{label}</span>
      {children}
    </label>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
