import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const isProd = process.env.NODE_ENV === "production";

// Production only: Next's dev server needs eval and websockets that this policy would block.
// Our own storage host is always allowed for images, including a plain-http local Supabase.
const storageOrigin = (() => { try { return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : ""; } catch { return ""; } })();

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  `img-src 'self' data: blob: https: ${storageOrigin}`.trim(),
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(storageOrigin.startsWith("http://") ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Chromium for PDF export ships binary files that must not be bundled, and must be copied into the PDF functions.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    // react-dom/server is loaded at runtime by the PDF code (see lib/pdf/static-markup.ts), so tracing can't see it.
    "/api/*/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**", "./node_modules/react-dom/**", "./node_modules/react/**", "./node_modules/scheduler/**"],
  },
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  async headers() {
    return [
      // General hardening first; the more specific rules below override it.
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" }, { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }, { key: "Content-Security-Policy", value: csp }] : []),
        ],
      },
      // Shared documents and their APIs must never be indexed or leak the token through referrers.
      { source: "/view/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }, { key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/api/public/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
      // Lets form submissions work through GitHub Codespaces / Gitpod style forwarded addresses.
      allowedOrigins: isProd ? [] : ["localhost:3000", "*.app.github.dev", "*.githubpreview.dev", "*.gitpod.io"],
    },
  },
};

export default nextConfig;
