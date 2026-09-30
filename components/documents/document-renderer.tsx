import type { BrandContext } from "@/lib/documents/branding";
import { calculateQuotation, formatMinor, formatMoney } from "@/lib/documents/quotation";
import type { Block, DocumentContent, Section } from "@/lib/documents/content";
import { documentCss, documentScope } from "@/lib/documents/css";
import { googleFontsUrl } from "@/lib/documents/fonts";
import type { TemplateConfig } from "@/lib/documents/templates";
import { SEVERITY_ORDER, formatDate, isSectionEmpty, pricingTotal, safeImageUrl } from "@/lib/documents/util";

export type Acceptance = { name: string; designation?: string; date: string; signatureDataUrl?: string | null };
export type RenderMeta = { type: "proposal" | "quotation" | "seo_audit" | "report"; acceptance?: Acceptance | null };

/**
 * The one document renderer. It is a pure function of (content, brand, template),
 * so the editor preview, public page and PDF can never drift apart.
 */
export function DocumentRenderer({
  content, brand, template, meta,
}: { content: DocumentContent; brand: BrandContext; template: TemplateConfig; meta: RenderMeta }) {
  const fonts = googleFontsUrl([brand.brand.headingFont, brand.brand.bodyFont]);
  const cls = `doc ${documentScope(brand.brand, template)} sec-${template.sectionStyle} tbl-${template.tableStyle}`;
  const hasCover = template.cover !== "none";
  // Section numbers skip sections whose title is hidden.
  const visible = content.sections.filter((s) => !isSectionEmpty(s));
  const numbers = new Map<string, number>();
  visible.reduce((n, s) => { if (s.hideTitle) return n; numbers.set(s.id, n + 1); return n + 1; }, 0);

  return (
    <div className={cls}>
      {fonts && <link rel="stylesheet" href={fonts} />}
      <style dangerouslySetInnerHTML={{ __html: documentCss(brand.brand, template) }} />
      {hasCover ? <Cover content={content} brand={brand} template={template} /> : <Letterhead content={content} brand={brand} meta={meta} />}
      {!hasCover && <Parties content={content} brand={brand} />}
      <div className="page">
        {visible.map((s) => {
          return <SectionView key={s.id} section={s} index={numbers.get(s.id) ?? 0} numbered={template.sectionStyle === "numbered"} content={content} brand={brand} meta={meta} />;
        })}
        <div className="foot">
          {brand.brand.footer ?? [brand.company.name, brand.company.email, brand.company.phone, brand.company.website].filter(Boolean).join("  ·  ")}
        </div>
      </div>
    </div>
  );
}

function Logo({ brand, onDark }: { brand: BrandContext; onDark: boolean }) {
  const url = safeImageUrl(onDark ? brand.brand.darkLogoUrl ?? brand.brand.logoUrl : brand.brand.logoUrl);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img className="logo" src={url} alt={`${brand.company.name} logo`} /> : <span className="brandname">{brand.company.name}</span>;
}

function Cover({ content, brand, template }: { content: DocumentContent; brand: BrandContext; template: TemplateConfig }) {
  const c = content.cover;
  const onDark = template.cover === "band";
  return (
    <header className={`cover ${template.cover}`}>
      <Logo brand={brand} onDark={onDark} />
      <div>
        {c.kicker && <p className="kicker">{c.kicker}</p>}
        <h1>{c.title}</h1>
        <div className="rule" />
        {c.subtitle && <p className="sub">{c.subtitle}</p>}
      </div>
      <dl className="meta">
        {c.preparedFor && <div><dt>Prepared for</dt><dd>{c.preparedFor}</dd></div>}
        <div><dt>Prepared by</dt><dd>{c.preparedBy || brand.company.name}</dd></div>
        {c.date && <div><dt>Date</dt><dd>{formatDate(c.date)}</dd></div>}
        {c.reference && <div><dt>Reference</dt><dd>{c.reference}</dd></div>}
      </dl>
    </header>
  );
}

function Letterhead({ content, brand, meta }: { content: DocumentContent; brand: BrandContext; meta: RenderMeta }) {
  const c = content.cover;
  const co = brand.company;
  const lines = [co.address, co.email, co.phone, co.website, co.gst ? `GST: ${co.gst}` : "", co.pan ? `PAN: ${co.pan}` : ""].filter(Boolean).join("\n");
  return (
    <header className="letterhead">
      <div><Logo brand={brand} onDark={false} /><div className="co">{lines}</div></div>
      <div className="title">
        <h1>{c.title}</h1>
        <p className="ref">{[c.reference, c.date && formatDate(c.date)].filter(Boolean).join("  ·  ")}{meta.type === "quotation" ? "" : ""}</p>
      </div>
    </header>
  );
}

function Parties({ content, brand }: { content: DocumentContent; brand: BrandContext }) {
  const cl = content.client;
  if (!cl.company && !cl.contact) return null;
  return (
    <div className="parties">
      <div><h4>Prepared for</h4><p>{[cl.company, cl.contact, cl.email, cl.phone, cl.address].filter(Boolean).map((l, i) => <span key={i}>{l}<br /></span>)}</p></div>
      <div><h4>Prepared by</h4><p><strong>{brand.company.name}</strong><br />{brand.company.signatory.name && <>{brand.company.signatory.name}<br /></>}{brand.company.email}</p></div>
    </div>
  );
}

function SectionView({ section, index, numbered, content, brand, meta }: { section: Section; index: number; numbered: boolean; content: DocumentContent; brand: BrandContext; meta: RenderMeta }) {
  return (
    <section className={`sec${section.pageBreakBefore ? " break" : ""}`}>
      {!section.hideTitle && <h2>{index > 0 && numbered && <span className="num">{String(index).padStart(2, "0")}</span>}{section.title}</h2>}
      {section.blocks.map((b) => <BlockView key={b.id} block={b} brand={brand} content={content} meta={meta} />)}
    </section>
  );
}

function BlockView({ block: b, brand, meta }: { block: Block; brand: BrandContext; content: DocumentContent; meta: RenderMeta }) {
  switch (b.type) {
    case "heading": return b.level === 2 ? <h2>{b.content}</h2> : <h3>{b.content}</h3>;
    case "paragraph":
      return <>{b.content.split(/\n{2,}/).filter((p) => p.trim()).map((p, i) => <p key={i} style={{ whiteSpace: "pre-line" }}>{p}</p>)}</>;
    case "callout": return <div className="callout">{b.content}</div>;
    case "list": {
      const Tag = b.style === "number" ? "ol" : "ul";
      return <Tag>{b.items.filter((i) => i.trim()).map((it, i) => <li key={i}>{it}</li>)}</Tag>;
    }
    case "table":
      return (
        <table>
          <thead><tr>{b.headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>{b.rows.map((r, ri) => <tr key={ri}>{b.headers.map((_, ci) => <td key={ci}>{r[ci] ?? ""}</td>)}</tr>)}</tbody>
        </table>
      );
    case "image": {
      const url = safeImageUrl(b.url);
      if (!url) return null;
      // eslint-disable-next-line @next/next/no-img-element
      return <figure><img src={url} alt={b.alt} />{b.caption && <figcaption>{b.caption}</figcaption>}</figure>;
    }
    case "timeline":
      return (
        <div className="timeline">
          {b.items.map((it) => (
            <div className="step" key={it.id}>
              <strong>{it.phase}</strong>{it.duration && <div className="dur">{it.duration}</div>}
              {it.description && <p>{it.description}</p>}
            </div>
          ))}
        </div>
      );
    case "pricing": return <Pricing b={b} />;
    case "quotation": return <QuotationView b={b} />;
    case "signature": return <SignatureView label={b.label} brand={brand} acceptance={meta.acceptance ?? null} />;
    case "page_break": return <div style={{ breakAfter: "page", pageBreakAfter: "always" }} aria-hidden />;
    case "audit_summary": return <AuditSummary b={b} />;
    case "audit_findings": return <AuditFindings b={b} />;
  }
}

function Pricing({ b }: { b: Extract<Block, { type: "pricing" }> }) {
  const total = pricingTotal(b);
  return (
    <>
      {b.packages.length > 0 && (
        <div className="packages">
          {b.packages.map((p) => (
            <div key={p.id} className={`pkg${p.selected ? " selected" : ""}`}>
              {p.selected && <span className="tag">Selected</span>}
              <strong>{p.name}</strong>
              <div className="price">{formatMoney(p.price, b.currency)}</div>
              {p.description && <p className="desc">{p.description}</p>}
              <ul>{p.features.filter(Boolean).map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
      {b.rows.length > 0 && (
        <table>
          <thead><tr><th>Item</th><th className="num-cell">Amount</th></tr></thead>
          <tbody>
            {b.rows.map((r) => (
              <tr key={r.id}><td>{r.name}{r.description && <div className="desc">{r.description}</div>}</td><td className="num-cell">{formatMoney(r.amount, b.currency)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="totals"><div className="grand"><span>Total investment</span><span>{formatMoney(total, b.currency)}</span></div></div>
      {b.note && <p className="desc" style={{ marginTop: 10 }}>{b.note}</p>}
    </>
  );
}

function QuotationView({ b }: { b: Extract<Block, { type: "quotation" }> }) {
  const d = b.data;
  const t = calculateQuotation(d);
  const cur = d.currency;
  const numbering = new Map(d.items.filter((i) => i.kind === "item").map((i, idx) => [i.id, idx + 1] as const));
  return (
    <>
      <table>
        <thead>
          <tr><th>#</th><th>Item</th><th className="num-cell">Qty</th><th className="num-cell">Rate</th><th className="num-cell">Discount</th><th className="num-cell">{d.taxLabel}</th><th className="num-cell">Amount</th></tr>
        </thead>
        <tbody>
          {d.items.length === 0 && <tr><td colSpan={7} className="empty">No items yet.</td></tr>}
          {d.items.map((it) => {
            if (it.kind === "section") return <tr className="group" key={it.id}><td colSpan={7}>{it.title}</td></tr>;
            const r = t.lines[it.id];
            return (
              <tr key={it.id}>
                <td>{numbering.get(it.id)}</td>
                <td>{it.name}{it.description && <div className="desc">{it.description}</div>}</td>
                <td className="num-cell">{it.quantity}{it.unit ? ` ${it.unit}` : ""}</td>
                <td className="num-cell">{formatMoney(it.unitPrice, cur)}</td>
                <td className="num-cell">{r.discount > 0 ? formatMinor(r.discount, cur) : "-"}</td>
                <td className="num-cell">{r.taxRate}%</td>
                <td className="num-cell">{formatMinor(r.total, cur)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="totals">
        <div><span>Subtotal</span><span>{formatMinor(t.subtotal, cur)}</span></div>
        {t.discount > 0 && <div><span>Discount</span><span>- {formatMinor(t.discount, cur)}</span></div>}
        {t.taxBuckets.map((x) => <div key={x.rate}><span>{x.label} {x.rate}%{d.taxInclusive ? " (incl.)" : ""}</span><span>{formatMinor(x.tax, cur)}</span></div>)}
        <div className="grand"><span>Total</span><span>{formatMinor(t.grandTotal, cur)}</span></div>
      </div>
    </>
  );
}

function SignatureView({ label, brand, acceptance }: { label: string; brand: BrandContext; acceptance: Acceptance | null }) {
  const s = brand.company.signatory;
  const sig = safeImageUrl(s.signatureUrl);
  const clientSig = safeImageUrl(acceptance?.signatureDataUrl);
  return (
    <div className="sig">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {sig ? <img src={sig} alt="Signature" /> : <div style={{ height: 48 }} />}
        <div className="line"><strong>{s.name || brand.company.name}</strong><br />{s.designation ? `${s.designation}, ` : ""}{brand.company.name}<br /><span className="accepted">{label}</span></div>
      </div>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {clientSig ? <img src={clientSig} alt="Client signature" /> : <div style={{ height: 48 }} />}
        <div className="line">
          {acceptance ? (<><strong>{acceptance.name}</strong><br />{acceptance.designation}<br /><span className="accepted">Accepted on {formatDate(acceptance.date)}</span></>)
            : <span className="accepted">Client acceptance</span>}
        </div>
      </div>
    </div>
  );
}

function Donut({ score, size = 76 }: { score: number; size?: number }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  const tone = score >= 80 ? "#2f7d55" : score >= 60 ? "#b08800" : "#b3261e";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(score)} percent`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e6e8ec" strokeWidth="7" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${(c * score) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size / 4} fontWeight="700" fill="#1b1d22">{Math.round(score)}%</text>
    </svg>
  );
}

function AuditSummary({ b }: { b: Extract<Block, { type: "audit_summary" }> }) {
  return (
    <>
      {b.intro && <p>{b.intro}</p>}
      <div className="scores">
        <div className="score"><Donut score={b.overall} size={92} /><div className="label"><strong>Overall SEO health</strong></div></div>
        {b.scores.map((s) => <div className="score" key={s.category}><Donut score={s.score} /><div className="label">{s.category}</div></div>)}
      </div>
    </>
  );
}

function AuditFindings({ b }: { b: Extract<Block, { type: "audit_findings" }> }) {
  const sorted = [...b.findings].sort((a, c) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[c.severity]);
  if (sorted.length === 0) return <p className="empty">Nothing to report in this category.</p>;
  return (
    <>
      {sorted.map((f) => (
        <div key={f.id} className={`finding ${f.severity}`}>
          <h4><span className={`sev ${f.severity}`}>{f.severity}</span>{f.issue}</h4>
          <dl>
            <dt>Why it matters</dt><dd>{f.explanation}</dd>
            {f.recommendation && <><dt>Recommended action</dt><dd>{f.recommendation}</dd></>}
            <dt>Priority</dt><dd style={{ textTransform: "capitalize" }}>{f.severity === "passed" ? "None, this check passed" : f.severity}</dd>
            {f.affectedUrl && <><dt>Affected pages</dt><dd>{f.affectedUrl}</dd></>}
          </dl>
        </div>
      ))}
    </>
  );
}
