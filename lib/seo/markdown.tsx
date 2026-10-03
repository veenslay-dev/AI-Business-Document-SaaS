import type { ReactNode } from "react";
import Link from "next/link";

/**
 * A deliberately small Markdown reader for the "extra content" box in the admin panel: ## and ### headings,
 * paragraphs, - and 1. lists, **bold** and [links](url). Everything is rendered as React elements, so no HTML
 * can get through, and links are limited to this site, https and mailto.
 */
export type Block =
  | { t: "h2"; text: string } | { t: "h3"; text: string } | { t: "p"; text: string }
  | { t: "ul"; items: string[] } | { t: "ol"; items: string[] };

export function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { t: "ul" | "ol"; items: string[] } | null = null;
  const flushPara = () => { if (para.length) blocks.push({ t: "p", text: para.join(" ") }); para = []; };
  const flushList = () => { if (list) blocks.push(list as Block); list = null; };
  for (const raw of src.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); continue; }
    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    if (h) { flushPara(); flushList(); blocks.push({ t: h[1] === "###" ? "h3" : "h2", text: h[2] }); continue; }
    const ul = /^[-*]\s+(.+)$/.exec(line), ol = /^\d+[.)]\s+(.+)$/.exec(line);
    if (ul || ol) {
      flushPara();
      const t = ul ? "ul" : "ol";
      if (!list || list.t !== t) { flushList(); list = { t, items: [] }; }
      list.items.push((ul ?? ol)![1]); continue;
    }
    flushList(); para.push(line);
  }
  flushPara(); flushList();
  return blocks;
}

export const safeHref = (url: string): string | null => {
  const u = url.trim();
  if (/^\/(?!\/)/.test(u) || /^#/.test(u)) return u;
  if (/^https:\/\//i.test(u) || /^mailto:[^\s@]+@[^\s@]+$/i.test(u)) return u;
  return null;
};

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={i++}>{m[1]}</strong>);
    else {
      const href = safeHref(m[3]);
      out.push(href ? (href.startsWith("/") || href.startsWith("#") ? <Link key={i++} href={href} className="font-medium text-brand hover:underline">{m[2]}</Link> : <a key={i++} href={href} rel="noopener noreferrer" className="font-medium text-brand hover:underline">{m[2]}</a>) : m[2]);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ md }: { md: string }) {
  return (
    <div className="space-y-3">
      {parseMarkdown(md).map((b, i) => {
        if (b.t === "h2") return <h2 key={i} className="pt-2 text-xl font-bold text-ink">{inline(b.text)}</h2>;
        if (b.t === "h3") return <h3 key={i} className="pt-1 text-lg font-bold text-ink">{inline(b.text)}</h3>;
        if (b.t === "ul") return <ul key={i} className="list-disc space-y-1.5 pl-5">{b.items.map((x, j) => <li key={j}>{inline(x)}</li>)}</ul>;
        if (b.t === "ol") return <ol key={i} className="list-decimal space-y-1.5 pl-5">{b.items.map((x, j) => <li key={j}>{inline(x)}</li>)}</ol>;
        return <p key={i}>{inline(b.text)}</p>;
      })}
    </div>
  );
}
