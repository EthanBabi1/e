import Link from "next/link";
import { CONFIG } from "@/lib/config";
import { getHomeStats } from "@/lib/home/getHomeStats";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { MagneticButton } from "@/components/motion/MagneticButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${CONFIG.platformName}: turn verified race results into sponsorship`,
  description:
    "Grassroots kart racers get a real profile built from verified results. Local businesses sponsor a racer, not just a logo on a kart. Tracks get free championship tools.",
};

const HOW_IT_WORKS = [
  {
    title: "Your results, verified",
    body: "Import from a transponder system, a photo of the results sheet, or type them in yourself. Every row is reviewed before it counts, and self-reported results are always labelled as such.",
  },
  {
    title: "A real profile, not a stat sheet",
    body: "Your story sits above the numbers. The results are the evidence; the story is what a local business actually responds to.",
  },
  {
    title: "Sponsored by name, not by luck",
    body: "Businesses browse racers near them and sponsor a zone on the kart (a decal spot, a season, an event) for a price you set within a fair range.",
  },
];

export default async function Home() {
  const stats = await getHomeStats();
  const hasActivity = stats.racerCount > 0;

  return (
    <main>
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-16">
        <Reveal>
          <p className="label-small mb-4">{CONFIG.launchTrack}</p>
        </Reveal>
        <Reveal index={1}>
          <h1 className="font-display text-5xl sm:text-6xl mb-6 text-balance">
            Your results are real.<br />Your sponsorship should be too.
          </h1>
        </Reveal>
        <Reveal index={2}>
          <p className="text-graphite mb-8 max-w-xl">
            {CONFIG.platformName} turns a grassroots kart racer&apos;s verified race record into a
            profile local businesses can actually sponsor. No paid placement, no invented
            rankings, ever.
          </p>
        </Reveal>
        <Reveal index={3}>
          <div className="flex flex-wrap gap-3">
            <MagneticButton href="/demo">See a finished profile</MagneticButton>
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center rounded-full border border-mist px-6 py-3 text-sm font-medium hover:border-ink transition-colors"
            >
              Browse sponsorable racers
            </Link>
          </div>
        </Reveal>
      </section>

      <section className="border-y border-mist bg-marble">
        <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { label: "Racer profiles", value: stats.racerCount },
            { label: "Verified results", value: stats.publishedResultCount },
            { label: "Tracks", value: stats.trackCount },
            { label: "Open sponsorships", value: stats.activeListingCount },
          ].map((stat, i) => (
            <Reveal key={stat.label} index={i}>
              <CountUp value={stat.value} className="font-display text-3xl block" />
              <p className="label-small mt-1">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {!hasActivity && (
        <section className="max-w-3xl mx-auto px-6 py-12">
          <Reveal>
            <p className="text-graphite text-sm">
              {CONFIG.platformName} is just getting started at {CONFIG.launchTrack}. The racers
              above are the first ones on the platform, not a filtered sample of a bigger list.
            </p>
          </Reveal>
        </section>
      )}

      <section className="max-w-5xl mx-auto px-6 py-16">
        <Reveal>
          <p className="label-small mb-2">How it works</p>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-6">
          {HOW_IT_WORKS.map((step, i) => (
            <Reveal key={step.title} index={i}>
              <p className="font-display text-2xl mb-2">{i + 1}</p>
              <p className="font-medium mb-2">{step.title}</p>
              <p className="text-graphite text-sm">{step.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t border-mist">
        <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <Reveal>
            <p className="font-medium mb-2">Racing, or a parent?</p>
            <p className="text-graphite text-sm mb-4">
              Claim your profile, or your racer&apos;s, and start building a real record.
            </p>
            <Link href="/for-parents" className="accent-underline text-sm">
              Read this first if your racer is under 18 →
            </Link>
          </Reveal>
          <Reveal index={1}>
            <p className="font-medium mb-2">A local business?</p>
            <p className="text-graphite text-sm mb-4">
              Sponsor a specific racer near you, at a price that&apos;s fair on both sides.
            </p>
            <Link href="/marketplace" className="accent-underline text-sm">
              Browse open sponsorships →
            </Link>
          </Reveal>
          <Reveal index={2}>
            <p className="font-medium mb-2">Run a track?</p>
            <p className="text-graphite text-sm mb-4">
              Free championship standings, results hosting, and an embeddable leaderboard for your own site.
            </p>
            <Link href="/tracks" className="accent-underline text-sm">
              Find your track →
            </Link>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
