import type { MetadataRoute } from "next";
import { ROBOTS_DISALLOW } from "@/lib/seo/robots";
import { siteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...ROBOTS_DISALLOW] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
