/**
 * Google Analytics 4 measurement ID.
 *
 * - NEXT_PUBLIC_GA_ID set to an ID uses that ID, anywhere. Set it to an empty value to switch analytics off.
 * - Otherwise the site's own ID is used on the live production deployment only, so local runs, tests and Vercel
 *   preview deployments never send visits to Google.
 * The value goes into a script, so anything that is not a plain GA4 ID is ignored.
 */
const DEFAULT_ID = "G-WMDN196VGY";

export function gaId(): string | null {
  const configured = process.env.NEXT_PUBLIC_GA_ID;
  const id = configured !== undefined ? configured.trim() : process.env.VERCEL_ENV === "production" ? DEFAULT_ID : "";
  return /^G-[A-Z0-9]{4,20}$/.test(id) ? id : null;
}

/**
 * Google Tag Manager container ID. Same rules as the analytics ID above: NEXT_PUBLIC_GTM_ID chooses another container
 * anywhere or, left empty, switches it off; otherwise the site's own container loads on the live production deployment only.
 */
const DEFAULT_GTM_ID = "GTM-WJM6W8LG";

export function gtmId(): string | null {
  const configured = process.env.NEXT_PUBLIC_GTM_ID;
  const id = configured !== undefined ? configured.trim() : process.env.VERCEL_ENV === "production" ? DEFAULT_GTM_ID : "";
  return /^GTM-[A-Z0-9]{4,12}$/.test(id) ? id : null;
}
