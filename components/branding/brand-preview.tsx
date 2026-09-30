import { ensureReadableOnWhite, readableOn } from "@/lib/documents/branding";
import { fontStack, googleFontsUrl } from "@/lib/documents/fonts";

export type PreviewBrand = {
  companyName: string; tagline?: string | null; email?: string | null; phone?: string | null; website?: string | null;
  primary: string; secondary: string; accent: string; header?: string | null; headingText?: string | null; headingFont: string; bodyFont: string;
  logoUrl?: string | null; footer?: string | null;
};

/** Small live sample of a branded proposal cover. Pure presentation; no data fetching. */
export function BrandPreview({ brand }: { brand: PreviewBrand }) {
  const fontsUrl = googleFontsUrl([brand.headingFont, brand.bodyFont]);
  const header = brand.header || brand.primary;
  const headingColor = ensureReadableOnWhite(brand.headingText || brand.primary);
  const onPrimary = readableOn(header);
  const heading = { fontFamily: fontStack(brand.headingFont) };
  const body = { fontFamily: fontStack(brand.bodyFont) };
  const name = brand.companyName || "Your Company";

  return (
    <figure aria-label="Brand preview" className="overflow-hidden rounded-lg border border-line-strong bg-white shadow-pop">
      {fontsUrl && <link rel="stylesheet" href={fontsUrl} />}
      <div className="flex min-h-56 flex-col justify-between p-6" style={{ background: header, color: onPrimary, ...body }}>
        <div className="flex items-center justify-between gap-3">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={`${name} logo`} className="h-8 max-w-40 object-contain" />
          ) : (
            <span className="text-sm font-semibold tracking-wide" style={heading}>{name}</span>
          )}
          <span className="text-[10px] uppercase tracking-[0.18em] opacity-70">Proposal</span>
        </div>
        <div>
          <div className="mb-3 h-1 w-10 rounded" style={{ background: brand.accent }} />
          <p className="text-2xl leading-tight" style={heading}>Website redesign and SEO growth plan</p>
          <p className="mt-2 text-xs opacity-75">Prepared for Nova Furniture by {name}</p>
        </div>
      </div>
      <div className="space-y-3 p-5" style={body}>
        <p className="text-sm font-semibold" style={{ ...heading, color: headingColor }}>Our approach</p>
        <p className="text-xs leading-relaxed text-ink-soft">
          We start with an audit of what already works, then build a plan around the pages that
          bring in enquiries.
        </p>
        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
          <span className="rounded px-2 py-1.5" style={{ background: brand.secondary, color: headingColor }}>Audit</span>
          <span className="rounded px-2 py-1.5" style={{ background: brand.secondary, color: headingColor }}>Build</span>
          <span className="rounded px-2 py-1.5 font-medium" style={{ background: brand.accent, color: readableOn(brand.accent) }}>Grow</span>
        </div>
      </div>
      <figcaption className="border-t px-5 py-3 text-[10px] text-ink-faint" style={{ borderColor: brand.secondary, ...body }}>
        {brand.footer || [brand.email, brand.phone, brand.website].filter(Boolean).join("  ·  ") || "Your contact details appear here"}
      </figcaption>
    </figure>
  );
}
