import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/pricing", "/about", "/contact"], disallow: ["/dashboard", "/clients", "/projects", "/proposals", "/quotations", "/invoices", "/seo-audits", "/social-audits", "/templates", "/brand-kit", "/team", "/settings", "/onboarding", "/search", "/admin", "/view/", "/invite/", "/api/", "/auth/"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
