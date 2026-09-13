import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { racers, sponsorships, tracks, users } from "@/db/schema";
import { getRacerResults } from "@/lib/telemetry";
import { getTrackRevenue } from "@/lib/tracks/getTrackPortalData";
import { sendEmail } from "@/lib/email/send";
import { SponsorDigestEmail } from "@/lib/email/templates/SponsorDigestEmail";
import { TrackRevenueDigestEmail } from "@/lib/email/templates/TrackRevenueDigestEmail";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Section 7: "an automated monthly digest of how their racers
 * performed... the digest is the renewal engine — build it properly." */
export async function sendSponsorDigests() {
  const sponsorRows = await db.selectDistinct({ sponsorUserId: sponsorships.sponsorUserId }).from(sponsorships);
  let sent = 0;

  for (const { sponsorUserId } of sponsorRows) {
    const [sponsor] = await db.select().from(users).where(eq(users.id, sponsorUserId));
    if (!sponsor) continue;

    const theirSponsorships = await db.select().from(sponsorships).where(eq(sponsorships.sponsorUserId, sponsorUserId));
    const racerIds = [...new Set(theirSponsorships.map((s) => s.racerId))];

    const summaries = [];
    for (const racerId of racerIds) {
      const [racer] = await db.select().from(racers).where(eq(racers.id, racerId));
      if (!racer) continue;
      const results = await getRacerResults(racerId);
      const recent = results.filter((r) => r.sessionType === "race" && Date.now() - new Date(r.date).getTime() < THIRTY_DAYS_MS);
      if (recent.length === 0) continue;
      const podiums = recent.filter((r) => r.position != null && r.position <= 3).length;
      summaries.push({
        name: racer.isMinor ? `${racer.firstName} ${racer.lastName.charAt(0)}.` : `${racer.firstName} ${racer.lastName}`,
        summary: `${recent.length} race${recent.length === 1 ? "" : "s"}${podiums > 0 ? `, ${podiums} podium${podiums === 1 ? "" : "s"}` : ""} this month.`,
      });
    }

    if (summaries.length === 0) continue;
    await sendEmail({ to: sponsor.email, subject: "Your sponsored racers this month", react: SponsorDigestEmail({ racerSummaries: summaries }) });
    sent++;
  }

  return { sent };
}

export async function sendTrackRevenueDigests() {
  const claimedTracks = await db.select().from(tracks).where(sql`${tracks.claimedByUserId} is not null`);
  let sent = 0;

  for (const track of claimedTracks) {
    if (!track.claimedByUserId) continue;
    const [owner] = await db.select().from(users).where(eq(users.id, track.claimedByUserId));
    if (!owner) continue;

    const revenue = await getTrackRevenue(track.id);
    if (revenue.gmv === 0) continue;

    await sendEmail({
      to: owner.email,
      subject: `${track.name} — monthly revenue summary`,
      react: TrackRevenueDigestEmail({ trackName: track.name, gmvUsd: revenue.gmv, trackShareUsd: revenue.trackShare }),
    });
    sent++;
  }

  return { sent };
}
