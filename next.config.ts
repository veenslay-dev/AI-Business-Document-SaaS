import type { NextConfig } from "next";
import { NOINDEX_HEADER, PRIVATE_PREFIXES } from "./lib/seo/robots";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const isProd = process.env.NODE_ENV === "production";

// Production only: Next's dev server needs eval and websockets that this policy would block.
// Our own storage host is always allowed for images, including a plain-http local Supabase.
const storageOrigin = (() => { try { return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : ""; } catch { return ""; } })();

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  `img-src 'self' data: blob: https: ${storageOrigin}`.trim(),
  "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.g.doubleclick.net https://www.google.com",
  "frame-src https://api.razorpay.com https://checkout.razorpay.com https://www.googletagmanager.com",
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
    // The sample documents on these pages are rendered to HTML at runtime (components/marketing/static-document.tsx).
    "/": ["./node_modules/react-dom/**", "./node_modules/react/**", "./node_modules/scheduler/**"],
    "/document-templates": ["./node_modules/react-dom/**", "./node_modules/react/**", "./node_modules/scheduler/**"],
    "/document-templates/*": ["./node_modules/react-dom/**", "./node_modules/react/**", "./node_modules/scheduler/**"],
    "/og": ["./public/logo.png"],
    "/opengraph-image": ["./public/logo.png"],
    // react-dom/server is loaded at runtime by the PDF code (see lib/pdf/static-markup.ts), so tracing can't see it.
    "/api/*/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**", "./node_modules/react-dom/**", "./node_modules/react/**", "./node_modules/scheduler/**"],
  },
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  // The bare domain sends visitors to www, keeping the path and query string.
  async redirects() {
    return [{ source: "/:path*", has: [{ type: "host", value: "priodraft.com" }], destination: "https://www.priodraft.com/:path*", permanent: true }];
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
      // Fonts never change under the same name, so browsers and CDNs can keep them for a year.
      { source: "/fonts/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      // Documents, PDFs, share and invite links, exports and the signed-in app are never indexed or followed.
      ...PRIVATE_PREFIXES.map((p) => ({ source: `${p}/:path*`, headers: [{ key: "X-Robots-Tag", value: NOINDEX_HEADER }] })),
      // Shared documents must also not leak the token through referrers.
      { source: "/view/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
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
