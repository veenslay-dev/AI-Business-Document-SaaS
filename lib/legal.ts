import { PRODUCT_NAME } from "@/components/ui/logo";

/** Bump this whenever any legal page changes in substance. */
export const LEGAL_UPDATED = "7 October 2026";
export const LEGAL_UPDATED_ISO = "2026-10-07";

/**
 * Who runs the service. Set NEXT_PUBLIC_LEGAL_NAME (for example "Naveen Pandey" or your registered company name) and,
 * if you want it shown, NEXT_PUBLIC_LEGAL_ADDRESS. Nothing is invented when they are blank.
 */
export const operator = () => ({
  name: process.env.NEXT_PUBLIC_LEGAL_NAME?.trim() || PRODUCT_NAME,
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS?.trim() || "",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "",
  city: process.env.NEXT_PUBLIC_LEGAL_JURISDICTION?.trim() || "",
});
