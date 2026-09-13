import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { guardianRacers, guardians, racers, users, zoneListings, zones } from "@/db/schema";
import { getProfileDataForRacer } from "@/lib/profile/getProfileData";

/**
 * Section 4: "One button generates a branded PDF: photo, story, record,
 * audience, available zones and prices, contact route." For an under-18
 * racer this carries the guardian's contact details, never the racer's,
 * and omits town/school — "it's a document that gets forwarded around a
 * town with no control over where it lands — treat it as fully public,
 * because it is."
 */
export async function generateMediaKitPdf(racerId: string): Promise<Uint8Array> {
  const [racer] = await db.select().from(racers).where(eq(racers.id, racerId));
  if (!racer) throw new Error("Racer not found");

  const data = await getProfileDataForRacer(racer);

  let contactEmail: string | null = null;
  if (racer.isMinor) {
    const [link] = await db.select().from(guardianRacers).where(eq(guardianRacers.racerId, racerId));
    if (link) {
      const [guardianRow] = await db.select().from(guardians).where(eq(guardians.id, link.guardianId));
      if (guardianRow) {
        const [guardianUser] = await db.select().from(users).where(eq(users.id, guardianRow.userId));
        contactEmail = guardianUser?.email ?? null;
      }
    }
  } else if (racer.userId) {
    const [user] = await db.select().from(users).where(eq(users.id, racer.userId));
    contactEmail = user?.email ?? null;
  }

  const openZones = await db
    .select({ name: zones.name, tier: zones.tier, priceUsd: zoneListings.priceUsd })
    .from(zoneListings)
    .innerJoin(zones, eq(zoneListings.zoneId, zones.id))
    .where(eq(zones.racerId, racerId));

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([612, 792]);
  let y = 792 - 50;

  const title = data.view.displayName;
  page.drawText(title, { x: 50, y, size: 26, font: bold });
  y -= 30;
  page.drawText([data.view.classDefault, data.homeTrackName].filter(Boolean).join(" · "), { x: 50, y, size: 12, font, color: rgb(0.35, 0.35, 0.35) });
  y -= 40;

  if (data.view.story) {
    page.drawText("Story", { x: 50, y, size: 10, font: bold, color: rgb(0.7, 0.06, 0.18) });
    y -= 18;
    for (const line of wrapText(data.view.story, 90)) {
      page.drawText(line, { x: 50, y, size: 11, font });
      y -= 15;
    }
    y -= 15;
  }

  page.drawText("Record", { x: 50, y, size: 10, font: bold, color: rgb(0.7, 0.06, 0.18) });
  y -= 18;
  for (const stat of data.headlineStats) {
    page.drawText(`${stat.value} ${stat.label}`, { x: 50, y, size: 11, font });
    y -= 15;
  }
  y -= 15;

  if (openZones.length > 0) {
    page.drawText("Available zones", { x: 50, y, size: 10, font: bold, color: rgb(0.7, 0.06, 0.18) });
    y -= 18;
    for (const zone of openZones) {
      page.drawText(`${zone.name} (${zone.tier})${zone.priceUsd != null ? ` — $${zone.priceUsd}` : ""}`, { x: 50, y, size: 11, font });
      y -= 15;
    }
    y -= 15;
  }

  page.drawText("Contact", { x: 50, y, size: 10, font: bold, color: rgb(0.7, 0.06, 0.18) });
  y -= 18;
  page.drawText(contactEmail ?? "Contact via the platform", { x: 50, y, size: 11, font });
  if (racer.isMinor) {
    y -= 15;
    page.drawText("(This racer is under 18 — contact goes to their parent/guardian.)", { x: 50, y, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
  }

  return pdf.save();
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      lines.push(current.trim());
      current = word;
    } else {
      current += " " + word;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}
