export const HEADING_FONTS = [
  "Fraunces", "Playfair Display", "DM Serif Display", "Lora", "Merriweather",
  "Poppins", "Montserrat", "Space Grotesk", "Inter",
] as const;
export const BODY_FONTS = [
  "Inter", "DM Sans", "Source Sans 3", "Open Sans", "Lato", "Roboto", "IBM Plex Sans",
] as const;

export const ALL_FONTS: readonly string[] = Array.from(new Set([...HEADING_FONTS, ...BODY_FONTS]));

const SERIF = new Set(["Fraunces", "Playfair Display", "DM Serif Display", "Lora", "Merriweather"]);

export function fontStack(name: string): string {
  const fallback = SERIF.has(name) ? "Georgia, 'Times New Roman', serif" : "system-ui, -apple-system, 'Segoe UI', sans-serif";
  return `'${name}', ${fallback}`;
}

/** Google Fonts stylesheet URL for the given families (whitelisted names only). */
export function googleFontsUrl(families: string[]): string {
  const safe = Array.from(new Set(families)).filter((f) => ALL_FONTS.includes(f));
  if (safe.length === 0) return "";
  const parts = safe.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700`);
  return `https://fonts.googleapis.com/css2?${parts.join("&")}&display=swap`;
}
