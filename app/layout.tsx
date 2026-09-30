import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PRODUCT_NAME } from "@/components/ui/logo";
import { siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${PRODUCT_NAME}: branded proposals, quotations and audits`, template: `%s | ${PRODUCT_NAME}` },
  description: "Build your company profile once. Generate branded client documents in minutes with AI.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
