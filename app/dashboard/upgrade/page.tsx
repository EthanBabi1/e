import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getManagedRacers } from "@/lib/dashboard/getCurrentRacer";
import { getSeasonGmvUsd } from "@/lib/subscriptions/seasonGmv";
import { computeProSavings } from "@/lib/pricing/takeRate";
import { CONFIG } from "@/lib/config";
import { UpgradeButton } from "./UpgradeButton";

export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/dashboard/upgrade");

  const managed = await getManagedRacers(session.user.id);
  const gmv = await getSeasonGmvUsd(managed.map((r) => r.id));
  const savings = computeProSavings(gmv);

  return (
    <main className="max-w-lg mx-auto px-6 py-16">
      <h1 className="font-display text-4xl mb-2">Pro</h1>
      <p className="text-graphite mb-8">
        Drops the platform&apos;s cut from {Math.round(CONFIG.takeRateFree * 100)}% to {Math.round(CONFIG.takeRatePro * 100)}%, plus a custom URL,
        a media kit, sponsor analytics, and marketplace priority.
      </p>

      <div className="rounded-xl border border-mist p-6 mb-8">
        <p className="label-small mb-2">This season so far</p>
        <p className="font-display text-3xl mb-4">${gmv.toFixed(0)} in sponsorship sold</p>
        {gmv > 0 ? (
          savings.worthIt ? (
            <p className="text-sm">
              At this rate, Pro would have saved you <span className="font-medium">${savings.feesSavedUsd.toFixed(0)}</span> in fees this season —{" "}
              <span className="font-medium">${savings.netBenefitUsd.toFixed(0)} ahead</span> of the ${CONFIG.proAnnualUsd} price.
            </p>
          ) : (
            <p className="text-sm text-graphite">
              Honestly, at this volume Pro would have saved you ${savings.feesSavedUsd.toFixed(0)} in fees — less than the ${CONFIG.proAnnualUsd}{" "}
              price. You&apos;re better off on the free tier for now.
            </p>
          )
        ) : (
          <p className="text-sm text-graphite">No sponsorship sold yet this season — the free tier costs nothing while you build your record.</p>
        )}
      </div>

      <UpgradeButton />
    </main>
  );
}
