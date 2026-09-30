import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/pricing"], disallow: ["/dashboard", "/clients", "/projects", "/proposals", "/quotations", "/seo-audits", "/templates", "/brand-kit", "/team", "/settings", "/onboarding", "/search", "/view/", "/invite/", "/api/", "/auth/"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
