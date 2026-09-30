import type { BrandContext } from "@/lib/documents/branding";
import { calculateQuotation, formatMinor, formatMoney } from "@/lib/documents/quotation";
import type { Block, DocumentContent, Section } from "@/lib/documents/content";
import { documentCss, documentScope } from "@/lib/documents/css";
import { googleFontsUrl } from "@/lib/documents/fonts";
import type { DocType, TemplateConfig } from "@/lib/documents/templates";
import { STATUS_LABEL, checklistScore, computeScorecard } from "@/lib/social/score";
import { SEVERITY_ORDER, formatDate, isSectionEmpty, pricingTotal, safeImageUrl } from "@/lib/documents/util";

export type Acceptance = { name: string; designation?: string; date: string; signatureDataUrl?: string | null };
export type RenderMeta = { type: DocType; acceptance?: Acceptance | null };

/**
 * The one document renderer. It is a pure function of (content, brand, template),
 * so the editor preview, public page and PDF can never drift apart.
 */
export function DocumentRenderer({
  content, brand, template, meta,
}: { content: DocumentContent; brand: BrandContext; template: TemplateConfig; meta: RenderMeta }) {
  const fonts = googleFontsUrl([brand.brand.headingFont, brand.brand.bodyFont]);
  const cls = `doc ${documentScope(brand.brand, template)} sec-${template.sectionStyle} tbl-${template.tableStyle} tot-${template.totals}`;
  const hasCover = template.cover !== "none";
  // Section numbers skip sections whose title is hidden.
  const visible = content.sections.filter((s) => !isSectionEmpty(s));
  const numbers = new Map<string, number>();
  visible.reduce((n, s) => { if (s.hideTitle) return n; numbers.set(s.id, n + 1); return n + 1; }, 0);

  return (
    <div className={cls}>
      {fonts && <link rel="stylesheet" href={fonts} />}
      <style dangerouslySetInnerHTML={{ __html: documentCss(brand.brand, template) }} />
      {hasCover ? <Cover content={content} brand={brand} template={template} /> : <Letterhead content={content} brand={brand} meta={meta} template={template} />}
      {!hasCover && <Parties content={content} brand={brand} />}
      {!hasCover && template.totals === "banner" && <TotalBanner content={content} />}
      <div className="page">
        {visible.map((s) => {
          return <SectionView key={s.id} section={s} index={numbers.get(s.id) ?? 0} numbered={template.sectionStyle === "numbered" || template.sectionStyle === "bar"} content={content} brand={brand} meta={meta} />;
        })}
        {!template.footerBar && (
          <div className="foot">
            {brand.brand.footer ?? [brand.company.name, brand.company.email, brand.company.phone, brand.company.website].filter(Boolean).join("  ·  ")}
          </div>
        )}
      </div>
      {template.footerBar && <FooterBar brand={brand} />}
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
  const onDark = template.cover === "band" || template.cover === "block";
  const meta = (
    <dl className="meta">
      {c.preparedFor && <div><dt>Prepared for</dt><dd>{c.preparedFor}</dd></div>}
      <div><dt>Prepared by</dt><dd>{c.preparedBy || brand.company.name}</dd></div>
      {c.date && <div><dt>Date</dt><dd>{formatDate(c.date)}</dd></div>}
      {c.reference && <div><dt>Reference</dt><dd>{c.reference}</dd></div>}
    </dl>
  );
  const titleBlock = (
    <div>
      {c.kicker && <p className="kicker">{c.kicker}</p>}
      <h1>{c.title}</h1>
      <div className="rule" />
      {c.subtitle && <p className="sub">{c.subtitle}</p>}
    </div>
  );
  if (template.cover === "block") {
    return (
      <header className="cover block">
        <div className="top"><Logo brand={brand} onDark />{titleBlock}</div>
        <div className="bottom">{meta}</div>
      </header>
    );
  }
  return (
    <header className={`cover ${template.cover}`}>
      <Logo brand={brand} onDark={onDark} />
      {titleBlock}
      {meta}
    </header>
  );
}

function FooterBar({ brand }: { brand: BrandContext }) {
  const c = brand.company;
  const items = brand.brand.footer ? [brand.brand.footer] : [c.name, c.email, c.phone, c.website].filter(Boolean) as string[];
  return <div className="footbar">{items.map((i) => <span key={i}>{i}</span>)}</div>;
}

function TotalBanner({ content }: { content: DocumentContent }) {
  for (const s of content.sections) {
    for (const b of s.blocks) {
      if (b.type === "quotation") {
        const t = calculateQuotation(b.data);
        return <div className="totalbanner"><span>Total investment<small>{b.data.taxInclusive ? "Including" : "Plus"} {b.data.taxLabel}</small></span><span>{formatMinor(t.grandTotal, b.data.currency)}</span></div>;
      }
    }
  }
  return null;
}

function Letterhead({ content, brand, meta, template }: { content: DocumentContent; brand: BrandContext; meta: RenderMeta; template: TemplateConfig }) {
  const c = content.cover;
  const co = brand.company;
  const lines = [co.address, co.email, co.phone, co.website, co.gst ? `GST: ${co.gst}` : "", co.pan ? `PAN: ${co.pan}` : ""].filter(Boolean).join("\n");
  const refLine = [c.reference, c.date && formatDate(c.date)].filter(Boolean).join("  ·  ");
  const kind = c.kicker || (meta.type === "quotation" ? "Quotation" : "");
  if (template.headerStyle === "banner") {
    return (
      <header className="lh banner">
        <div><Logo brand={brand} onDark /><div className="co">{[co.email, co.phone, co.website].filter(Boolean).join("  ·  ")}</div></div>
        <div className="title"><div className="doctype">{kind || c.title}</div>{kind && <div className="doctitle">{c.title}</div>}<div className="ref">{refLine}</div></div>
      </header>
    );
  }
  if (template.headerStyle === "studio") {
    return (
      <header className="lh studio">
        <div className="row"><Logo brand={brand} onDark={false} /><div className="doctype">{kind || c.title}</div></div>
        <div className="rule"><i /><b /><span>{co.website?.replace(/^https?:\/\//, "")}</span></div>
        <div className="row"><div className="co">{lines}</div><div style={{ textAlign: "right" }}>{kind && <div className="doctitle"><strong>{c.title}</strong></div>}<div className="ref">{refLine}</div></div></div>
      </header>
    );
  }
  return (
    <header className="lh classic">
      <div><Logo brand={brand} onDark={false} /><div className="co">{lines}</div></div>
      <div className="title"><h1>{c.title}</h1><p className="ref">{refLine}</p></div>
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

function BlockView({ block: b, brand, meta, content }: { block: Block; brand: BrandContext; content: DocumentContent; meta: RenderMeta }) {
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
    case "checklist": return <ChecklistView b={b} />;
    case "scorecard": return <ScorecardView b={b} content={content} />;
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
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={score >= 100 ? size / 5 : size / 4} fontWeight="700" fill="#1b1d22">{Math.round(score)}%</text>
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

const STATUS_CLASS = { good: "good", needs_work: "needs", poor: "poor", na: "na", unchecked: "unchecked" } as const;

function ChecklistView({ b }: { b: Extract<Block, { type: "checklist" }> }) {
  const rows = b.items.filter((i) => i.item.trim());
  const r = checklistScore(rows);
  return (
    <>
      {r.score !== null && (
        <div className="sectionscore"><strong>{r.score}%</strong><span className="bar"><i style={{ width: `${r.score}%` }} /></span><span>{r.checked} of {r.total} checked</span></div>
      )}
      {b.summary.trim() && <div className="sectionnote">{b.summary}</div>}
      <table className="checklist">
        <thead><tr><th>Checkpoint</th><th>Status</th><th>Observation and recommendation</th></tr></thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.id}>
              <td className="item">{i.item}</td>
              <td className="status"><span className={`sev ${STATUS_CLASS[i.status]}`}>{STATUS_LABEL[i.status]}</span>{i.priority && i.status !== "good" && i.status !== "na" && <span className="pri">{i.priority} priority</span>}</td>
              <td>{i.note && <div className="note" style={{ whiteSpace: "pre-line" }}>{i.note}</div>}{i.recommendation && <div className="rec"><strong>Recommendation:</strong> {i.recommendation}</div>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ScorecardView({ b, content }: { b: Extract<Block, { type: "scorecard" }>; content: DocumentContent }) {
  const sc = computeScorecard(content);
  const scored = sc.sections.filter((s) => s.score !== null);
  return (
    <>
      {b.intro && <p>{b.intro}</p>}
      {sc.overall === null ? (
        <p className="empty">Scores appear here as the checklists are filled in.</p>
      ) : (
        <>
          <div className="scores">
            <div className="score"><Donut score={sc.overall} size={92} /><div className="label"><strong>Overall</strong></div></div>
            {scored.map((s) => <div className="score" key={s.title}><Donut score={s.score ?? 0} /><div className="label">{s.title}</div></div>)}
          </div>
          <p className="desc">{sc.counts.good + sc.counts.needs_work + sc.counts.poor} checkpoints reviewed: {sc.counts.good} good, {sc.counts.needs_work} need work, {sc.counts.poor} poor.{sc.counts.unchecked > 0 ? ` ${sc.counts.unchecked} not checked yet.` : ""}</p>
          {sc.priorities.length > 0 && (
            <>
              <h3>Biggest opportunities</h3>
              <table>
                <thead><tr><th>Area</th><th>Checkpoint</th><th>Status</th><th>Recommended action</th></tr></thead>
                <tbody>
                  {sc.priorities.slice(0, 8).map((p, i) => (
                    <tr key={i}><td>{p.section}</td><td>{p.item}</td><td><span className={`sev ${p.status === "poor" ? "poor" : "needs"}`}>{STATUS_LABEL[p.status]}</span></td><td>{p.recommendation || <span className="empty">To be discussed</span>}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </>
  );
}
