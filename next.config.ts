import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // Chromium for PDF export ships binary files that must not be bundled, and must be copied into the PDF functions.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/*/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  async headers() {
    return [
      // General hardening first; the more specific rules below override it.
      { source: "/:path*", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "X-Frame-Options", value: "SAMEORIGIN" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }] },
      // Shared documents and their APIs must never be indexed or leak the token through referrers.
      { source: "/view/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }, { key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/api/public/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
      // Lets form submissions work through GitHub Codespaces / Gitpod style forwarded addresses.
      allowedOrigins: ["localhost:3000", "*.app.github.dev", "*.githubpreview.dev", "*.gitpod.io"],
    },
  },
};

export default nextConfig;
