import { render } from "@react-email/render";
import { NewMessageEmailPreview } from "@/lib/email/templates/NewMessageEmail";
import { SponsorshipSoldEmailPreview } from "@/lib/email/templates/SponsorshipSoldEmail";
import { ClaimInvitationEmailPreview } from "@/lib/email/templates/ClaimInvitationEmail";
import { StaleSyncEmailPreview } from "@/lib/email/templates/StaleSyncEmail";
import { SponsorDigestEmail } from "@/lib/email/templates/SponsorDigestEmail";
import { TrackRevenueDigestEmail } from "@/lib/email/templates/TrackRevenueDigestEmail";

// Section 10: "Templates in React Email, previewable at /dev/emails in
// development." Guarded below so this never ships reachable in production.
const TEMPLATES = [
  { name: "New message", element: NewMessageEmailPreview },
  { name: "Sponsorship sold (financial)", element: SponsorshipSoldEmailPreview },
  { name: "Claim invitation", element: ClaimInvitationEmailPreview },
  { name: "Stale MYLAPS sync", element: StaleSyncEmailPreview },
  {
    name: "Sponsor monthly digest",
    element: <SponsorDigestEmail racerSummaries={[{ name: "Jordan Vance", summary: "3 races, 2 podiums this month." }]} />,
  },
  { name: "Track revenue digest", element: <TrackRevenueDigestEmail trackName="Millhaven Kart Club (demo)" gmvUsd={1200} trackShareUsd={36} /> },
];

export default async function DevEmailsPage() {
  if (process.env.NODE_ENV === "production") {
    return <main className="p-8">Not available in production.</main>;
  }

  const rendered = await Promise.all(TEMPLATES.map(async (t) => ({ ...t, html: await render(t.element) })));

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl mb-8">Email previews (dev only)</h1>
      <div className="space-y-10">
        {rendered.map((t) => (
          <div key={t.name}>
            <p className="label-small mb-2">{t.name}</p>
            <iframe title={t.name} srcDoc={t.html} className="w-full h-96 border border-mist rounded-xl" />
          </div>
        ))}
      </div>
    </main>
  );
}
