import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getProfileDataBySlug } from "@/lib/profile/getProfileData";
import { canGenerateShareCard } from "@/lib/minors";

// Node runtime, not edge — the Postgres client (lib/db) needs Node's net
// module, which the edge runtime doesn't provide.
/**
 * Section 11: "Every result, badge, personal best and track record
 * generates an OG image good enough to post." Section 3's hard limit
 * applies here too: never generated for an unclaimed minor.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getProfileDataBySlug(slug);
  if (!data) return new Response("Not found", { status: 404 });

  if (!canGenerateShareCard({ isMinor: data.racer.isMinor, claimStatus: data.racer.claimStatus })) {
    return new Response("Share cards are not generated for an unclaimed minor's profile.", { status: 403 });
  }

  const stat = data.headlineStats[0];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #FFFFFF 0%, #F2F0EC 55%, #E6E4DF 100%)",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 20, letterSpacing: 4, color: "#5A5A5E", textTransform: "uppercase" }}>
          {data.homeTrackName ?? "Podium Row"}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 64, color: "#0A0A0B" }}>{data.view.displayName}</div>
          <div style={{ display: "flex", fontSize: 28, color: "#5A5A5E", marginTop: 12 }}>{data.view.classDefault}</div>
        </div>
        {stat && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <div style={{ display: "flex", fontSize: 72, color: "#C8102E" }}>{stat.value}</div>
            <div style={{ display: "flex", fontSize: 24, color: "#5A5A5E" }}>{stat.label}</div>
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
