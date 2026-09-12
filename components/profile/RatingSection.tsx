import { confidenceBandLabel } from "@/lib/ratings/engine";

/**
 * Public rating display — section 8: hidden entirely while provisional
 * ("below the provisional threshold never appears on a public page").
 * This component simply doesn't render if isProvisional is true; there is
 * no "provisional" badge shown publicly, because showing anything at all
 * here (even a caveated one) is the thing the rule forbids.
 */
export function PublicRatingSection({
  isProvisional,
  mu,
  sigma,
  className,
}: {
  isProvisional: boolean;
  mu: number;
  sigma: number;
  className: string;
}) {
  if (isProvisional) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-marble px-4 py-2">
      <span className="label-small">{className} rating</span>
      <span className="font-mono-tabular text-sm">{confidenceBandLabel({ mu, sigma, rankedResultCount: 0 })}</span>
    </div>
  );
}

/** Racer/guardian-only private view — always visible regardless of
 * provisional status, per section 8 ("Show it privately, labelled
 * provisional, so they can watch it settle"). Used on the dashboard, not
 * the public profile. */
export function PrivateRatingWidget({
  isProvisional,
  mu,
  sigma,
  rankedResultCount,
  threshold,
  className,
}: {
  isProvisional: boolean;
  mu: number;
  sigma: number;
  rankedResultCount: number;
  threshold: number;
  className: string;
}) {
  return (
    <div className="rounded-xl border border-mist p-4">
      <p className="label-small mb-1">
        {className} rating {isProvisional && "— provisional"}
      </p>
      <p className="font-mono-tabular text-2xl">{confidenceBandLabel({ mu, sigma, rankedResultCount })}</p>
      {isProvisional && (
        <p className="text-xs text-graphite mt-1">
          {rankedResultCount} of {threshold} ranked results — this settles and goes public once you clear the threshold.
        </p>
      )}
    </div>
  );
}
