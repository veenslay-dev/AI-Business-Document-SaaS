import type { BrandContext } from "./branding";
import { ensureReadableOn, mixColors, pageTheme, readableOn } from "./branding";
import type { TemplateConfig } from "./templates";
import { isHexColor } from "./util";

const color = (c: string | undefined | null, fallback: string) => (c && isHexColor(c) ? c : fallback);

/** Stable short hash used to give each brand and template combination its own CSS scope. */
function hash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Class name that scopes one document's stylesheet, so several branded documents can share a page. */
export function documentScope(brand: BrandContext["brand"], t: TemplateConfig, pageBg?: string | null): string {
  return `doc-${hash(JSON.stringify([brand.primary, brand.secondary, brand.accent, brand.header, brand.headingText, brand.headingStack, brand.bodyStack, t, pageBg ?? ""]))}`;
}

export function documentCss(brand: BrandContext["brand"], t: TemplateConfig, pageBg?: string | null): string {
  return scoped(baseCss(brand, t, color(pageBg, "#ffffff")), documentScope(brand, t, pageBg));
}

/** Rewrites the `.doc` selectors in the base stylesheet to the scope class. */
function scoped(css: string, scope: string): string {
  return css.replace(/\.doc(?![A-Za-z0-9_-])/g, `.${scope}`);
}

/**
 * Stylesheet shared by the editor preview, public page and PDF.
 * Colors come from the brand kit through CSS variables, with three roles kept apart so nothing
 * is ever the same color as its background:
 *   --header   background of cover bands, table headers and total bars (text on it is chosen for contrast)
 *   --heading  text color of titles on white paper (always darkened until readable)
 *   --accent   small highlights: rules, numbers, tags
 */
function baseCss(brand: BrandContext["brand"], t: TemplateConfig, bg: string): string {
  const primary = color(brand.primary, "#1f3a5f");
  const secondary = color(brand.secondary, "#e8eef6");
  const accent = color(brand.accent, "#c8553d");
  const header = color(brand.header, primary);
  const theme = pageTheme(bg, secondary);
  const heading = ensureReadableOn(color(brand.headingText, primary), bg);
  const deep = mixColors("#000000", header, 0.82); // a near-black shade of the header color, for dark covers
  const headFont = (t.headings === "serif" ? brand.headingStack : brand.bodyStack).replace(/[<>{}]/g, "");
  const pad = t.density === "compact" ? 0.7 : 1;

  return `
.doc{--primary:${primary};--secondary:${secondary};--accent:${accent};--header:${header};--on-header:${readableOn(header)};--heading:${heading};--on-accent:${readableOn(accent)};
  --tint:${theme.tint};--paper:${theme.paper};--card:${theme.card};--deep:${deep};
  --ink:${theme.ink};--muted:${theme.muted};--line:${theme.line};--hfont:${headFont};--bfont:${brand.bodyStack.replace(/[<>{}]/g, "")};
  font-family:var(--bfont);color:var(--ink);font-size:${t.density === "compact" ? 12.5 : 14}px;line-height:1.6;background:var(--paper);
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.doc *{box-sizing:border-box}
.doc :is(h1,[data-h="1"]),.doc :is(h2,[data-h="2"]),.doc :is(h3,[data-h="3"]),.doc :is(h4,[data-h="4"]){font-family:var(--hfont);color:var(--heading);margin:0;line-height:1.2;font-weight:${t.headings === "sans" ? 700 : 600}}
.doc :is(h2,[data-h="2"]),.doc :is(h3,[data-h="3"]){break-after:avoid;page-break-after:avoid}
.doc p{margin:0 0 ${0.8 * pad}em;orphans:3;widows:3}
.doc img{max-width:100%}
.doc .page{padding:${44 * pad}px ${52 * pad}px}

/* Covers */
.doc .cover{position:relative;min-height:1040px;display:flex;flex-direction:column;justify-content:space-between;padding:56px;break-after:page;page-break-after:always}
.doc .cover.band{background:var(--header);color:var(--on-header)}
.doc .cover.band :is(h1,[data-h="1"]){color:var(--on-header)}
.doc .cover.split{padding-left:120px;border-left:56px solid var(--header)}
.doc .cover.minimal{min-height:640px;border-bottom:1px solid var(--line)}
.doc .cover.block{padding:0;justify-content:flex-start}
.doc .cover.block .top{background:var(--header);color:var(--on-header);padding:56px;min-height:640px;display:flex;flex-direction:column;justify-content:space-between}
.doc .cover.block :is(h1,[data-h="1"]){color:var(--on-header);font-size:48px}
.doc .cover.block .bottom{padding:40px 56px;flex:1;display:flex;flex-direction:column;justify-content:flex-end;border-bottom:14px solid var(--accent)}
.doc .cover.block .meta{color:var(--ink)}
.doc .cover.block .meta dt{color:var(--muted);opacity:1}
.doc .cover.frame{margin:28px;min-height:984px;border:2px solid var(--header);outline:1px solid var(--header);outline-offset:-10px;text-align:center;align-items:center;padding:72px 56px}
.doc .cover.frame .rule{margin:22px auto}
.doc .cover.frame :is(h1,[data-h="1"]){max-width:14em;font-size:42px}
.doc .cover.frame .meta{text-align:center;width:100%}
.doc .cover.noir{background:var(--deep);color:#fff;overflow:hidden}
.doc .cover.noir:before{content:"";position:absolute;top:0;right:0;width:44%;height:30%;background:var(--accent);border-bottom-left-radius:220px}
.doc .cover.noir:after{content:"";position:absolute;left:56px;bottom:170px;width:84px;height:6px;background:var(--accent)}
.doc .cover.noir>*{position:relative;z-index:1}
.doc .cover.noir :is(h1,[data-h="1"]){color:#fff;font-size:54px;max-width:11em;line-height:1.08}
.doc .cover.noir .rule{display:none}
.doc .cover.noir .brandname{color:#fff}
.doc .cover.noir .sub{opacity:.8}
.doc .cover.aurora{color:#fff;background:radial-gradient(120% 90% at 100% 0%,var(--accent) 0%,transparent 55%),radial-gradient(90% 70% at 0% 100%,var(--header) 0%,transparent 60%),var(--deep)}
.doc .cover.aurora :is(h1,[data-h="1"]){color:#fff;font-size:50px}
.doc .cover.aurora .brandname{color:#fff}
.doc .cover.aurora .rule{background:#fff;opacity:.85}
.doc .cover.sidebar{padding:0;flex-direction:row;justify-content:flex-start}
.doc .cover.sidebar aside{width:34%;background:var(--header);color:var(--on-header);padding:56px 34px;display:flex;flex-direction:column;justify-content:space-between}
.doc .cover.sidebar aside .brandname{color:var(--on-header)}
.doc .cover.sidebar aside .meta{grid-template-columns:1fr;gap:18px}
.doc .cover.sidebar .main{flex:1;display:flex;flex-direction:column;justify-content:center;padding:56px 48px;border-right:14px solid var(--accent)}
.doc .cover.sidebar :is(h1,[data-h="1"]){font-size:44px}
.doc .cover.sidebar .kicker{color:var(--accent);opacity:1}
.doc .toc{break-after:page;page-break-after:always;margin-bottom:${34 * pad}px}
.doc .toc :is(h2,[data-h="2"]){font-size:26px;margin-bottom:18px}
.doc .toc ol{list-style:none;margin:0;padding:0}
.doc .toc li{display:flex;gap:16px;align-items:baseline;padding:11px 0;border-bottom:1px solid var(--line);font-size:15px}
.doc .toc .n{font-family:var(--hfont);color:var(--accent);font-weight:700;min-width:2em;font-variant-numeric:tabular-nums}
.doc .frbar{display:none}
.doc.sec-card .frbar{display:block;background:#111;color:#fff;font-family:var(--bfont);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:9px 14px;margin:6px 0 12px;border-radius:3px}
.doc.sec-card section.sec{border:1px solid var(--line);border-left:6px solid var(--accent);border-radius:4px;padding:${20 * pad}px 22px;background:var(--card)}
.doc.sec-card section.sec>:is(h2,[data-h="2"]){font-size:26px;border-bottom:1px solid var(--line);padding-bottom:10px}
.doc.pps section.sec{margin-bottom:${34 * pad}px}
.doc .cover .logo{max-height:52px;max-width:220px;object-fit:contain}
.doc .cover .brandname{font-family:var(--hfont);font-size:20px;font-weight:600}
.doc .cover.band .brandname,.doc .cover.block .top .brandname{color:var(--on-header)}
.doc .cover .kicker{font-size:12px;letter-spacing:.2em;text-transform:uppercase;opacity:.75;margin-bottom:18px}
.doc .cover.frame .kicker{color:var(--accent);opacity:1}
.doc .cover :is(h1,[data-h="1"]){font-size:44px;max-width:15em}
.doc .cover .rule{width:56px;height:4px;background:var(--accent);margin:22px 0}
.doc .cover .sub{font-size:17px;max-width:32em;opacity:.9}
.doc .cover .meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:20px;font-size:13px}
.doc .cover .meta dt{font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.65;margin-bottom:2px}
.doc .cover .meta dd{margin:0;font-weight:500}

/* Letterheads (no cover page) */
.doc .lh{padding:${36 * pad}px 52px ${20 * pad}px}
.doc .lh .logo{max-height:46px;max-width:200px;object-fit:contain}
.doc .lh .brandname{font-family:var(--hfont);font-size:20px;color:var(--heading);font-weight:700}
.doc .lh .co{font-size:12px;color:var(--muted);margin-top:6px;white-space:pre-line}
.doc .lh .ref{font-size:12px;color:var(--muted);margin-top:4px}
.doc .lh.classic{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;border-bottom:3px solid var(--header)}
.doc .lh.classic .title{text-align:right}
.doc .lh.classic .title :is(h1,[data-h="1"]){font-size:28px}
.doc .lh.banner{background:var(--header);color:var(--on-header);display:flex;justify-content:space-between;align-items:center;gap:24px;padding:${34 * pad}px 52px}
.doc .lh.banner .brandname{color:var(--on-header)}
.doc .lh.banner .co{color:var(--on-header);opacity:.8}
.doc .lh.banner .title{text-align:right}
.doc .lh.banner .doctype{font-family:var(--hfont);font-size:34px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--on-header);line-height:1}
.doc .lh.banner .doctitle{font-size:14px;margin-top:8px;color:var(--on-header);opacity:.9}
.doc .lh.banner .ref{color:var(--on-header);opacity:.8}
.doc .lh.studio{padding-bottom:0}
.doc .lh.studio .row{display:flex;justify-content:space-between;align-items:center;gap:24px}
.doc .lh.studio .doctype{font-family:var(--hfont);font-size:44px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--heading);line-height:1}
.doc .lh.studio .rule{display:flex;align-items:center;gap:0;margin:18px 0 6px}
.doc .lh.studio .rule i{display:block;height:4px;width:12%;background:var(--accent)}
.doc .lh.studio .rule b{display:block;height:1px;flex:1;background:var(--line-strong,#b9bdc6)}
.doc .lh.studio .rule span{font-size:12px;color:var(--muted);letter-spacing:.06em;margin-left:12px}
.doc .lh.studio .doctitle{font-size:15px;color:var(--ink);margin-top:10px}
.doc .parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:${22 * pad}px 52px 0;font-size:13px}
.doc .parties>div{border-left:3px solid var(--accent);padding-left:14px}
.doc .parties :is(h4,[data-h="4"]){font-family:var(--bfont);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:4px}
.doc .totalbanner{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:${22 * pad}px 52px 0;padding:14px 20px;background:var(--accent);color:var(--on-accent);font-weight:700;font-size:18px;border-radius:2px}
.doc .totalbanner small{font-size:12px;font-weight:500;opacity:.9;display:block}

/* Sections */
.doc section.sec{margin-bottom:${34 * pad}px}
.doc section.sec.break{break-before:page;page-break-before:always}
.doc section.sec>:is(h2,[data-h="2"]){font-size:24px;margin-bottom:${14 * pad}px}
.doc.sec-ruled section.sec>:is(h2,[data-h="2"]){border-bottom:2px solid var(--header);padding-bottom:8px}
.doc.sec-numbered section.sec>:is(h2,[data-h="2"]) .num,.doc.sec-bar section.sec>:is(h2,[data-h="2"]) .num{display:inline-block;min-width:2.2em;color:var(--accent);font-variant-numeric:tabular-nums}
.doc.sec-bar section.sec>:is(h2,[data-h="2"]){font-size:19px;background:var(--tint);border-left:6px solid var(--header);padding:9px 14px;margin-bottom:${16 * pad}px;border-radius:0 3px 3px 0}
.doc :is(h3,[data-h="3"]){font-size:17px;margin:${18 * pad}px 0 6px}
.doc ul,.doc ol{margin:0 0 ${0.9 * pad}em;padding-left:1.3em}
.doc li{margin-bottom:.35em}
.doc .callout{background:var(--tint);border-left:4px solid var(--accent);padding:12px 16px;margin:0 0 1em;border-radius:2px;break-inside:avoid}

/* Tables */
.doc table{width:100%;border-collapse:collapse;margin:0 0 1em;font-size:13px}
.doc th{background:var(--header);color:var(--on-header);text-align:left;font-weight:700;padding:9px 10px;font-size:12px;letter-spacing:.02em}
.doc td{padding:8px 10px;vertical-align:top;border-bottom:1px solid var(--line)}
.doc tr{break-inside:avoid;page-break-inside:avoid}
.doc thead{display:table-header-group}
.doc.tbl-striped tbody tr:nth-child(even) td{background:var(--tint)}
.doc.tbl-boxed td,.doc.tbl-boxed th{border:1px solid var(--line)}
.doc.tbl-fill td{border-bottom:1px solid var(--line)}
.doc.tbl-fill tbody tr:last-child td{border-bottom:2px solid var(--header)}
.doc.tbl-lined th{background:transparent;color:var(--heading);border-bottom:2px solid var(--header)}
.doc .num-cell{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.doc tr.group td{background:var(--tint);color:var(--heading);font-weight:700}
.doc .totals{margin-left:auto;width:min(100%,340px);font-size:13px;break-inside:avoid}
.doc .totals div{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--line)}
.doc .totals .grand{background:var(--header);color:var(--on-header);padding:10px 12px;margin-top:6px;border:0;font-weight:700;font-size:15px}
.doc.tot-banner .totals .grand{background:var(--accent);color:var(--on-accent)}
.doc .desc{color:var(--muted);font-size:12px;margin-top:2px}
.doc .timeline{border-left:2px solid var(--tint);margin-left:6px;padding-left:20px}
.doc .timeline .step{position:relative;margin-bottom:16px;break-inside:avoid}
.doc .timeline .step:before{content:"";position:absolute;left:-27px;top:5px;width:12px;height:12px;border-radius:50%;background:var(--accent)}
.doc .timeline .dur{font-size:12px;color:var(--accent);font-weight:700;filter:brightness(.8)}
.doc .packages{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:1em}
.doc .pkg{border:1px solid var(--line);padding:14px;border-radius:4px;break-inside:avoid}
.doc .pkg.selected{border:2px solid var(--accent);background:var(--tint)}
.doc .pkg .price{font-family:var(--hfont);font-size:22px;color:var(--heading);margin:4px 0 8px}
.doc .pkg .tag{font-size:10px;letter-spacing:.12em;text-transform:uppercase;background:var(--accent);color:var(--on-accent);padding:2px 6px;border-radius:2px;display:block;width:max-content;margin-bottom:6px}
.doc .pkg ul{font-size:12.5px;padding-left:1.1em;margin:0}
.doc figure{margin:0 0 1em;break-inside:avoid}
.doc figcaption{font-size:12px;color:var(--muted);margin-top:4px}
.doc .sig{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:24px;break-inside:avoid}
.doc .sig .line{border-top:1px solid var(--ink);padding-top:6px;margin-top:8px;font-size:12px}
.doc .sig img{max-height:64px;display:block}
.doc .sig .accepted{color:var(--muted);font-size:12px}

/* Audits */
.doc .scores{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:14px;margin:12px 0 18px}
.doc .score{text-align:center;border:1px solid var(--line);border-radius:4px;padding:14px 8px;break-inside:avoid;background:var(--card)}
.doc .score .label{font-size:12px;color:var(--muted);margin-top:6px}
.doc .finding{border:1px solid var(--line);border-left-width:5px;border-radius:3px;padding:12px 14px;margin-bottom:12px;break-inside:avoid}
.doc .finding :is(h4,[data-h="4"]){font-size:15px;margin-bottom:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:var(--ink)}
.doc .finding dl{margin:0;display:grid;grid-template-columns:130px 1fr;gap:4px 12px;font-size:13px}
.doc .finding dt{color:var(--muted);font-weight:600}
.doc .finding dd{margin:0;overflow-wrap:anywhere}
.doc .sev{white-space:nowrap;font-family:var(--bfont);font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:2px 7px;border-radius:3px;font-weight:700;color:#fff}
.doc .sev.critical,.doc .sev.poor{background:#b3261e}.doc .sev.high{background:#d9631b}.doc .sev.medium,.doc .sev.needs{background:#b08800}.doc .sev.low{background:#4a6fa5}.doc .sev.passed,.doc .sev.good{background:#2f7d55}.doc .sev.na,.doc .sev.unchecked{background:#8a909b}
.doc .finding.critical{border-left-color:#b3261e}.doc .finding.high{border-left-color:#d9631b}.doc .finding.medium{border-left-color:#b08800}.doc .finding.low{border-left-color:#4a6fa5}.doc .finding.passed{border-left-color:#2f7d55}
.doc .chartrow{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:6px 0 18px}
.doc .chartcard{border:1px solid var(--line);border-radius:4px;padding:12px 14px;background:var(--card);break-inside:avoid;min-width:0}
.doc .chartcard :is(h4,[data-h="4"]){font-family:var(--bfont);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:700;margin:0 0 10px}
.doc .chart.pie{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.doc .legend{list-style:none;margin:0;padding:0;font-size:12px;flex:1;min-width:110px}
.doc .legend li{display:flex;align-items:center;gap:7px;padding:2px 0}
.doc .legend i{width:10px;height:10px;border-radius:2px;flex:none}
.doc .legend b{margin-left:auto;padding-left:8px;font-variant-numeric:tabular-nums}
.doc .chart.bars .brow{display:grid;grid-template-columns:minmax(70px,34%) 1fr 38px;gap:8px;align-items:center;font-size:12px;padding:3px 0}
.doc .chart.bars .bl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.doc .chart.bars .bt{height:9px;background:var(--line);border-radius:5px;overflow:hidden}
.doc .chart.bars .bt i{display:block;height:100%;border-radius:5px}
.doc .chart.bars .bv{text-align:right;font-variant-numeric:tabular-nums;color:var(--muted)}
.doc .chart.radar{display:flex;justify-content:center}
.doc .gallery{display:grid;gap:12px;margin:10px 0}
  .doc .gallery.cols-1{grid-template-columns:1fr}.doc .gallery.cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.doc .gallery.cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
  .doc .gallery figure{margin:0;break-inside:avoid}.doc .gallery img{width:100%;height:auto;border:1px solid var(--line);border-radius:3px;display:block}
  .doc .gallery figcaption{font-size:11.5px;color:var(--muted);margin-top:4px}
  .doc .shot{display:block;max-width:100%;max-height:260px;margin-top:8px;border:1px solid var(--line);border-radius:3px;break-inside:avoid}
  .doc .checklist td.status{white-space:nowrap;width:1%}
.doc .checklist td.item{font-weight:600;width:34%}
.doc .checklist .note{color:var(--ink)}
.doc .checklist .rec{color:var(--muted);font-size:12px;margin-top:3px}
.doc .checklist .pri{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);display:block;margin-top:4px}
.doc .sectionscore{display:flex;align-items:center;gap:12px;margin:-4px 0 10px;font-size:12px;color:var(--muted)}
.doc .sectionscore .bar{flex:1;max-width:220px;height:8px;background:var(--line);border-radius:4px;overflow:hidden}
.doc .sectionscore .bar i{display:block;height:100%;background:var(--accent)}
.doc .sectionnote{background:var(--tint);border-left:4px solid var(--accent);padding:10px 14px;margin:0 0 12px;font-size:13px;border-radius:2px}

/* Footers */
.doc .foot{border-top:1px solid var(--line);margin-top:40px;padding-top:12px;font-size:11.5px;color:var(--muted);text-align:center}
.doc .footbar{background:var(--header);color:var(--on-header);padding:14px 52px;font-size:12px;display:flex;flex-wrap:wrap;gap:6px 26px;justify-content:center;break-inside:avoid}
.doc .empty{color:var(--muted);font-style:italic}
@media (max-width:640px){
  .doc .page,.doc .cover{padding:24px}.doc .lh,.doc .parties{padding-left:24px;padding-right:24px}
  .doc .cover{min-height:auto;gap:40px}.doc .cover :is(h1,[data-h="1"]){font-size:30px}.doc .cover.split{padding-left:60px;border-left-width:24px}
  .doc .cover.block .top{min-height:420px;padding:28px}.doc .cover.block .bottom{padding:24px}.doc .cover.frame{margin:12px;padding:40px 24px}
  .doc .parties,.doc .sig{grid-template-columns:1fr}.doc .lh.classic,.doc .lh.banner,.doc .lh.studio .row{flex-direction:column;align-items:flex-start}.doc .lh .title{text-align:left}
  .doc .lh.studio .doctype{font-size:30px}.doc .totalbanner{margin-left:24px;margin-right:24px}.doc .footbar{padding:14px 24px}
  .doc .finding dl{grid-template-columns:1fr}.doc table{display:block;overflow-x:auto}
}
@media print{.doc.pps section.sec{break-before:page;page-break-before:always;margin-bottom:0}.doc.pps .toc+section.sec{break-before:auto}.doc .cover.sidebar aside{min-height:297mm}.doc .cover{min-height:257mm}.doc .cover.block{min-height:297mm}.doc .cover.frame{margin:10mm;min-height:277mm}.doc .page{padding:0}.doc .lh,.doc .parties{padding-left:0;padding-right:0}.doc .lh.banner{padding:8mm 10mm;margin:0}.doc .totalbanner{margin-left:0;margin-right:0}.doc .footbar{padding:5mm 10mm;margin:0}}
`;
}
