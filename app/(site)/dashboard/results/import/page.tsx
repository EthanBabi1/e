import { db } from "@/db/client";
import { tracks } from "@/db/schema";
import { ImportWizard } from "./ImportWizard";

export const dynamic = "force-dynamic";

/**
 * Phase 2 ingest wizard. Not behind auth yet (Phase 4 wires session-based
 * racer identity) — reachable directly for now, same caveat as /admin.
 * The full aesthetic pass (motion, empty/sparse states) lands with the
 * rest of the dashboard shell in Phase 3/4; this is the functional core.
 */
export default async function ImportPage() {
  const allTracks = await db.select({ id: tracks.id, name: tracks.name }).from(tracks);

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <p className="label-small mb-2">Add results</p>
      <h1 className="font-display text-4xl mb-2">Get your results onto your profile</h1>
      <p className="text-graphite mb-10 max-w-xl">
        Pick how you have them — a photo of the sheet, a spreadsheet from the track, or type them in yourself.
      </p>
      <ImportWizard tracks={allTracks} />
    </main>
  );
}
