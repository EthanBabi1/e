import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { events, raceSessions, results, racers, tracks } from "@/db/schema";
import { ageDisplay } from "@/lib/minors";

const PAGE_MARGIN = 40;
const ROW_HEIGHT = 16;

export async function generateResultsPdf(racerId: string): Promise<Uint8Array> {
  const [racer] = await db.select().from(racers).where(eq(racers.id, racerId));
  if (!racer) throw new Error("Racer not found");

  const rows = await db
    .select({
      date: events.date,
      track: tracks.name,
      className: raceSessions.className,
      sessionType: raceSessions.type,
      position: results.position,
      bestLapMs: results.bestLapMs,
      status: results.status,
      provenance: results.provenance,
    })
    .from(results)
    .innerJoin(raceSessions, eq(results.sessionId, raceSessions.id))
    .innerJoin(events, eq(raceSessions.eventId, events.id))
    .innerJoin(tracks, eq(events.trackId, tracks.id))
    .where(and(eq(results.racerId, racerId)))
    .orderBy(asc(events.date));

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([612, 792]); // US Letter
  let y = 792 - PAGE_MARGIN;

  const age = ageDisplay(racer);
  const title = racer.isMinor ? `${racer.firstName} ${racer.lastName.charAt(0)}.` : `${racer.firstName} ${racer.lastName}`;

  page.drawText(title, { x: PAGE_MARGIN, y, size: 22, font: boldFont });
  y -= 26;
  page.drawText(
    [racer.classDefault, age != null ? `Age ${age}` : null].filter(Boolean).join(" · "),
    { x: PAGE_MARGIN, y, size: 11, font, color: rgb(0.4, 0.4, 0.4) }
  );
  y -= 20;
  page.drawText("Official race record — exported from Podium Row. This record is never deleted by the platform.", {
    x: PAGE_MARGIN,
    y,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
  y -= 24;

  const columns = ["Date", "Track", "Class", "Session", "Pos", "Best Lap", "Status", "Provenance"];
  const columnWidths = [60, 130, 90, 60, 30, 60, 50, 100];

  function drawRow(cells: string[], opts: { bold?: boolean } = {}) {
    let x = PAGE_MARGIN;
    cells.forEach((cell, i) => {
      page.drawText(cell, { x, y, size: 9, font: opts.bold ? boldFont : font });
      x += columnWidths[i];
    });
    y -= ROW_HEIGHT;
  }

  drawRow(columns, { bold: true });
  y -= 4;

  for (const r of rows) {
    if (y < PAGE_MARGIN + ROW_HEIGHT) {
      page = pdf.addPage([612, 792]);
      y = 792 - PAGE_MARGIN;
    }
    drawRow([
      r.date,
      r.track,
      r.className,
      r.sessionType,
      r.position != null ? String(r.position) : "—",
      r.bestLapMs != null ? (r.bestLapMs / 1000).toFixed(3) + "s" : "—",
      r.status,
      r.provenance.replace(/_/g, " "),
    ]);
  }

  return pdf.save();
}
