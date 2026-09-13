import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfileDataBySlug } from "@/lib/profile/getProfileData";
import { RacerProfileView } from "@/components/profile/RacerProfileView";
import { JsonLd } from "@/components/seo/JsonLd";
import { CONFIG } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProfileDataBySlug(slug);
  if (!data) return {};

  const title = `${data.view.displayName}, ${data.view.classDefault ?? "Kart racer"} | ${CONFIG.platformName}`;
  const description = data.headlineStats.length
    ? `${data.view.displayName}: ${data.headlineStats.map((s) => `${s.value} ${s.label}`).join(", ")}.`
    : `${data.view.displayName}'s verified karting record on ${CONFIG.platformName}.`;

  return {
    title,
    description,
    // Section 3 hard limit: an unclaimed minor's page is never indexed.
    robots: data.view.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      images: data.view.photoUrl ? [data.view.photoUrl] : [`/api/images/fallback/${data.view.id}`],
    },
  };
}

export default async function RacerProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getProfileDataBySlug(slug);
  if (!data) notFound();

  return (
    <>
      {/* Section 9 DoD requirement: structured data on every racer page.
          Never emitted for an unclaimed minor — same rule as noindex. */}
      {!data.view.noindex && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Person",
            name: data.view.displayName,
            // Deliberately no birthDate/address here — same redaction
            // rule as the rendered page, structured data isn't exempt.
            memberOf: data.homeTrackName
              ? { "@type": "SportsOrganization", name: data.homeTrackName }
              : undefined,
          }}
        />
      )}
      <RacerProfileView data={data} />
    </>
  );
}
