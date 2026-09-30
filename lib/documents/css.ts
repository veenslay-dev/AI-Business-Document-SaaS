import type { BrandContext } from "./branding";
import { readableOn } from "./branding";
import type { TemplateConfig } from "./templates";
import { isHexColor } from "./util";

const color = (c: string, fallback: string) => (isHexColor(c) ? c : fallback);

/**
 * Stylesheet shared by the editor preview, public page and PDF.
 * All colors and fonts come from the brand kit through CSS variables.
 * Values are validated (hex colors, whitelisted font stacks) before being written.
 */
/** Stable short hash used to give each brand and template combination its own CSS scope. */
function hash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Class name that scopes one document's stylesheet, so several branded documents can share a page. */
export function documentScope(brand: BrandContext["brand"], t: TemplateConfig): string {
  return `doc-${hash(JSON.stringify([brand.primary, brand.secondary, brand.accent, brand.headingStack, brand.bodyStack, t]))}`;
}

export function documentCss(brand: BrandContext["brand"], t: TemplateConfig): string {
  const scope = documentScope(brand, t);
  return scoped(baseCss(brand, t), scope);
}

/** Rewrites the `.doc` selectors in the base stylesheet to the scope class. */
function scoped(css: string, scope: string): string {
  return css.replace(/\.doc(?![A-Za-z0-9_-])/g, `.${scope}`);
}

function baseCss(brand: BrandContext["brand"], t: TemplateConfig): string {
  const primary = color(brand.primary, "#1f3a5f");
  const secondary = color(brand.secondary, "#e8eef6");
  const accent = color(brand.accent, "#c8553d");
  const heading = t.headings === "serif" ? brand.headingStack : brand.bodyStack;
  const pad = t.density === "compact" ? 0.7 : 1;

  return `
.doc{--primary:${primary};--secondary:${secondary};--accent:${accent};--on-primary:${readableOn(primary)};--on-accent:${readableOn(accent)};
  --ink:#1b1d22;--muted:#5b616d;--line:#dcdfe5;--hfont:${heading.replace(/[<>{}]/g, "")};--bfont:${brand.bodyStack.replace(/[<>{}]/g, "")};
  font-family:var(--bfont);color:var(--ink);font-size:${t.density === "compact" ? 12.5 : 14}px;line-height:1.6;background:#fff;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.doc *{box-sizing:border-box}
.doc h1,.doc h2,.doc h3,.doc h4{font-family:var(--hfont);color:var(--primary);margin:0;line-height:1.2;font-weight:600}
.doc h2,.doc h3{break-after:avoid;page-break-after:avoid}
.doc p{margin:0 0 ${0.8 * pad}em;orphans:3;widows:3}
.doc img{max-width:100%}
.doc .page{padding:${44 * pad}px ${52 * pad}px}
.doc .cover{position:relative;min-height:1040px;display:flex;flex-direction:column;justify-content:space-between;padding:56px;break-after:page;page-break-after:always}
.doc .cover.band{background:var(--primary);color:var(--on-primary)}
.doc .cover.band h1{color:var(--on-primary)}
.doc .cover.split{padding-left:120px;border-left:56px solid var(--primary)}
.doc .cover.minimal{min-height:640px;border-bottom:1px solid var(--line)}
.doc .cover .logo{max-height:52px;max-width:220px;object-fit:contain}
.doc .cover .brandname{font-family:var(--hfont);font-size:20px;font-weight:600}
.doc .cover .kicker{font-size:12px;letter-spacing:.2em;text-transform:uppercase;opacity:.75;margin-bottom:18px}
.doc .cover h1{font-size:44px;max-width:15em}
.doc .cover .rule{width:56px;height:4px;background:var(--accent);margin:22px 0}
.doc .cover .sub{font-size:17px;max-width:32em;opacity:.9}
.doc .cover .meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:20px;font-size:13px}
.doc .cover .meta dt{font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.65;margin-bottom:2px}
.doc .cover .meta dd{margin:0;font-weight:500}
.doc .letterhead{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;padding:${36 * pad}px 52px ${20 * pad}px;border-bottom:3px solid var(--primary)}
.doc .letterhead .logo{max-height:46px;max-width:200px;object-fit:contain}
.doc .letterhead .brandname{font-family:var(--hfont);font-size:20px;color:var(--primary);font-weight:600}
.doc .letterhead .co{font-size:12px;color:var(--muted);margin-top:6px;white-space:pre-line}
.doc .letterhead .title{text-align:right}
.doc .letterhead .title h1{font-size:28px}
.doc .letterhead .title .ref{font-size:12px;color:var(--muted);margin-top:4px}
.doc .parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:${20 * pad}px 52px 0;font-size:13px}
.doc .parties h4{font-family:var(--bfont);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:4px}
.doc section.sec{margin-bottom:${34 * pad}px}
.doc section.sec.break{break-before:page;page-break-before:always}
.doc section.sec>h2{font-size:24px;margin-bottom:${14 * pad}px}
.doc.sec-ruled section.sec>h2{border-bottom:2px solid var(--primary);padding-bottom:8px}
.doc.sec-numbered section.sec>h2 .num{display:inline-block;min-width:2.2em;color:var(--accent);font-variant-numeric:tabular-nums}
.doc h3{font-size:17px;margin:${18 * pad}px 0 6px}
.doc ul,.doc ol{margin:0 0 ${0.9 * pad}em;padding-left:1.3em}
.doc li{margin-bottom:.35em}
.doc .callout{background:var(--secondary);border-left:4px solid var(--accent);padding:12px 16px;margin:0 0 1em;border-radius:2px;break-inside:avoid}
.doc table{width:100%;border-collapse:collapse;margin:0 0 1em;font-size:13px}
.doc th{background:var(--primary);color:var(--on-primary);text-align:left;font-weight:600;padding:8px 10px;font-size:12px}
.doc td{padding:8px 10px;vertical-align:top;border-bottom:1px solid var(--line)}
.doc tr{break-inside:avoid;page-break-inside:avoid}
.doc thead{display:table-header-group}
.doc.tbl-striped tbody tr:nth-child(even) td{background:#f6f7f9}
.doc.tbl-boxed td,.doc.tbl-boxed th{border:1px solid var(--line)}
.doc .num-cell{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.doc tr.group td{background:var(--secondary);color:var(--primary);font-weight:600}
.doc .totals{margin-left:auto;width:min(100%,340px);font-size:13px;break-inside:avoid}
.doc .totals div{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--line)}
.doc .totals .grand{background:var(--primary);color:var(--on-primary);padding:10px 12px;margin-top:6px;border:0;font-weight:600;font-size:15px}
.doc .desc{color:var(--muted);font-size:12px;margin-top:2px}
.doc .timeline{border-left:2px solid var(--secondary);margin-left:6px;padding-left:20px}
.doc .timeline .step{position:relative;margin-bottom:16px;break-inside:avoid}
.doc .timeline .step:before{content:"";position:absolute;left:-27px;top:5px;width:12px;height:12px;border-radius:50%;background:var(--accent)}
.doc .timeline .dur{font-size:12px;color:var(--accent);font-weight:600}
.doc .packages{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:1em}
.doc .pkg{border:1px solid var(--line);padding:14px;border-radius:4px;break-inside:avoid}
.doc .pkg.selected{border:2px solid var(--accent);background:var(--secondary)}
.doc .pkg .price{font-family:var(--hfont);font-size:22px;color:var(--primary);margin:4px 0 8px}
.doc .pkg .tag{font-size:10px;letter-spacing:.12em;text-transform:uppercase;background:var(--accent);color:var(--on-accent);padding:2px 6px;border-radius:2px;display:block;width:max-content;margin-bottom:6px}
.doc .pkg ul{font-size:12.5px;padding-left:1.1em;margin:0}
.doc figure{margin:0 0 1em;break-inside:avoid}
.doc figcaption{font-size:12px;color:var(--muted);margin-top:4px}
.doc .sig{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:24px;break-inside:avoid}
.doc .sig .line{border-top:1px solid var(--ink);padding-top:6px;margin-top:8px;font-size:12px}
.doc .sig img{max-height:64px;display:block}
.doc .sig .accepted{color:var(--muted);font-size:12px}
.doc .scores{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:14px;margin:12px 0 18px}
.doc .score{text-align:center;border:1px solid var(--line);border-radius:4px;padding:14px 8px;break-inside:avoid}
.doc .score .label{font-size:12px;color:var(--muted);margin-top:6px}
.doc .finding{border:1px solid var(--line);border-left-width:5px;border-radius:3px;padding:12px 14px;margin-bottom:12px;break-inside:avoid}
.doc .finding h4{font-size:15px;margin-bottom:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.doc .finding dl{margin:0;display:grid;grid-template-columns:130px 1fr;gap:4px 12px;font-size:13px}
.doc .finding dt{color:var(--muted);font-weight:600}
.doc .finding dd{margin:0;overflow-wrap:anywhere}
.doc .sev{font-family:var(--bfont);font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:2px 7px;border-radius:3px;font-weight:700;color:#fff}
.doc .sev.critical{background:#b3261e}.doc .sev.high{background:#d9631b}.doc .sev.medium{background:#b08800}.doc .sev.low{background:#4a6fa5}.doc .sev.passed{background:#2f7d55}
.doc .finding.critical{border-left-color:#b3261e}.doc .finding.high{border-left-color:#d9631b}.doc .finding.medium{border-left-color:#b08800}.doc .finding.low{border-left-color:#4a6fa5}.doc .finding.passed{border-left-color:#2f7d55}
.doc .foot{border-top:1px solid var(--line);margin-top:40px;padding-top:12px;font-size:11.5px;color:var(--muted);text-align:center}
.doc .empty{color:var(--muted);font-style:italic}
@media (max-width:640px){
  .doc .page,.doc .cover{padding:24px}.doc .letterhead,.doc .parties{padding-left:24px;padding-right:24px}
  .doc .cover{min-height:auto;gap:40px}.doc .cover h1{font-size:30px}.doc .cover.split{padding-left:60px;border-left-width:24px}
  .doc .parties,.doc .sig{grid-template-columns:1fr}.doc .letterhead{flex-direction:column}.doc .letterhead .title{text-align:left}
  .doc .finding dl{grid-template-columns:1fr}.doc table{display:block;overflow-x:auto}
}
@media print{.doc .cover{min-height:257mm}.doc .page{padding:0}.doc .letterhead,.doc .parties{padding-left:0;padding-right:0}}
`;
}
