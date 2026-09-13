import Link from "next/link";
import { CONFIG } from "@/lib/config";
import { getHomeStats } from "@/lib/home/getHomeStats";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { SpeedLines } from "@/components/motion/SpeedLines";
import { HeroKartSection } from "@/components/home/HeroKartSection";

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
      <section className="relative overflow-hidden bg-ink text-paper">
        <SpeedLines className="absolute -top-4 right-0 w-[280px] sm:w-[460px] h-auto opacity-90 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 pt-24 pb-20">
          <Reveal>
            <p className="text-[11px] tracking-[0.12em] uppercase text-silver mb-4">{CONFIG.launchTrack}</p>
          </Reveal>
          <Reveal index={1}>
            <h1 className="font-display text-5xl sm:text-7xl mb-6 text-balance">
              Your results are real.<br />Your <span className="text-accent">sponsorship</span> should be too.
            </h1>
          </Reveal>
          <Reveal index={2}>
            <p className="text-silver mb-9 max-w-xl text-lg">
              {CONFIG.platformName} turns a grassroots kart racer&apos;s verified race record into a
              profile local businesses can actually sponsor. No paid placement, no invented
              rankings, ever.
            </p>
          </Reveal>
          <Reveal index={3}>
            <div className="flex flex-wrap gap-4">
              <MagneticButton
                href="/demo"
                className="glass-button glass-button-accent inline-flex items-center justify-center rounded-full text-ink px-7 py-3.5 text-sm font-medium"
              >
                See a finished profile
              </MagneticButton>
              <MagneticButton
                href="/marketplace"
                className="glass-button inline-flex items-center justify-center rounded-full text-ink px-7 py-3.5 text-sm font-medium"
              >
                Browse sponsorable racers
              </MagneticButton>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-accent text-paper">
        <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { label: "Racer profiles", value: stats.racerCount },
            { label: "Verified results", value: stats.publishedResultCount },
            { label: "Tracks", value: stats.trackCount },
            { label: "Open sponsorships", value: stats.activeListingCount },
          ].map((stat, i) => (
            <Reveal key={stat.label} index={i}>
              <CountUp value={stat.value} className="font-display text-4xl block" />
              <p className="text-[11px] tracking-[0.12em] uppercase text-paper/75 mt-1">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <HeroKartSection />

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
              <p className="font-display text-4xl mb-3 text-accent">{i + 1}</p>
              <p className="font-medium mb-2">{step.title}</p>
              <p className="text-graphite text-sm">{step.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative border-t border-mist py-16 overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-20 left-1/4 w-96 h-96 rounded-full opacity-40 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(200,16,46,0.25) 0%, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-24 right-1/4 w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(10,10,11,0.15) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-5xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              title: "Racing, or a parent?",
              body: "Claim your profile, or your racer's, and start building a real record.",
              href: "/for-parents",
              cta: "Read this first if your racer is under 18",
            },
            {
              title: "A local business?",
              body: "Sponsor a specific racer near you, at a price that's fair on both sides.",
              href: "/marketplace",
              cta: "Browse open sponsorships",
            },
            {
              title: "Run a track?",
              body: "Free championship standings, results hosting, and an embeddable leaderboard for your own site.",
              href: "/tracks",
              cta: "Find your track",
            },
          ].map((card, i) => (
            <Reveal key={card.title} index={i}>
              <div className="glass rounded-2xl p-6 h-full">
                <p className="font-medium mb-2">{card.title}</p>
                <p className="text-graphite text-sm mb-4">{card.body}</p>
                <Link href={card.href} className="accent-underline text-sm">
                  {card.cta} →
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}
