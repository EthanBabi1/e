import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSponsorshipsForUser } from "@/lib/sponsorships/getForUser";
import { EmptyState } from "@/components/ui/EmptyState";
import { SponsorshipCard } from "./SponsorshipCard";

export const dynamic = "force-dynamic";

export default async function SponsorshipsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/dashboard/sponsorships");

  const rows = await getSponsorshipsForUser(session.user.id);

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl mb-8">Sponsorships</h1>
      {rows.length === 0 ? (
        <EmptyState title="No sponsorships yet" body="Sales and purchases will show up here." />
      ) : (
        <div className="space-y-4">
          {rows.map(({ sponsorship, racer }) => (
            <SponsorshipCard
              key={sponsorship.id}
              sponsorship={sponsorship}
              racerName={`${racer.firstName} ${racer.lastName}`}
              isSponsor={sponsorship.sponsorUserId === session.user.id}
            />
          ))}
        </div>
      )}
    </main>
  );
}
