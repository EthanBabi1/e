import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getClaimInvitation } from "@/lib/accounts/claim";
import { db } from "@/db/client";
import { racers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ClaimForm } from "./ClaimForm";

export const dynamic = "force-dynamic";

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getClaimInvitation(token);
  if (!invite || invite.usedAt) {
    return (
      <main className="max-w-md mx-auto px-6 py-24 text-center">
        <p className="font-display text-2xl mb-2">This claim link isn&apos;t valid</p>
        <p className="text-graphite">It may have already been used, or the link was copied incorrectly.</p>
      </main>
    );
  }

  const [racer] = await db.select().from(racers).where(eq(racers.id, invite.racerId));
  if (!racer) return null;

  const session = await auth();
  if (!session?.user) {
    redirect(`/sign-in?callbackUrl=/claim/${token}`);
  }

  return <ClaimForm token={token} racer={{ id: racer.id, firstName: racer.firstName, lastName: racer.lastName, isMinor: racer.isMinor }} />;
}
