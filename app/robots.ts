import type { MetadataRoute } from "next";
import { CONFIG } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/api", "/demo", "/embed", "/track-portal", "/claim"] }],
    sitemap: `https://${CONFIG.domain}/sitemap.xml`,
  };
}
