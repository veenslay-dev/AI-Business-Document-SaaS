import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Toaster } from "sonner";
import { PRODUCT_NAME } from "@/components/ui/logo";
import { siteUrl } from "@/lib/utils";

/**
 * Every page gets a canonical URL that points at itself (no query string), so nothing is ever left without one.
 * Public pages override this with their own metadata, which also points at themselves unless an admin sets another address.
 */
export async function generateMetadata(): Promise<Metadata> {
  const path = (await headers()).get("x-pathname") || "/";
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${PRODUCT_NAME}: branded proposals, quotations and audits`, template: `%s | ${PRODUCT_NAME}` },
    description: "Build your company profile once. Generate branded client documents in minutes with AI.",
    alternates: { canonical: path },
  };
}
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" />
      </head>
      <body>{children}<Toaster position="bottom-right" richColors closeButton /></body>
    </html>
  );
}
