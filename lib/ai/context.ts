import type { BrandContext } from "@/lib/documents/branding";

export type KnowledgeItem = { title: string; type: string; content: string | null };

const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "your", "our", "are", "you", "will", "have", "into"]);
const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));

/** Picks the knowledge base entries that share the most words with the query. No embeddings needed for the MVP. */
export function selectKnowledge(items: KnowledgeItem[], query: string, limit = 4): KnowledgeItem[] {
  const q = new Set(tokens(query));
  if (q.size === 0) return [];
  return items
    .map((it) => {
      const words = tokens(`${it.title} ${it.content ?? ""}`);
      const score = words.reduce((n, w) => n + (q.has(w) ? 1 : 0), 0) + (tokens(it.title).some((w) => q.has(w)) ? 3 : 0);
      return { it, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.it);
}

/** Facts about the sender that every prompt starts from. */
export function companyContext(ctx: BrandContext, knowledge: KnowledgeItem[] = []): string {
  const c = ctx.company;
  const lines = [
    `Company: ${c.name}`,
    c.tagline && `Tagline: ${c.tagline}`,
    c.description && `About: ${c.description}`,
    c.services.length > 0 && `Services: ${c.services.join("; ")}`,
    c.website && `Website: ${c.website}`,
  ].filter(Boolean) as string[];
  if (knowledge.length > 0) {
    lines.push("", "Relevant company knowledge (use it where it fits, do not invent beyond it):");
    for (const k of knowledge) lines.push(`- [${k.type}] ${k.title}: ${(k.content ?? "").slice(0, 700)}`);
  }
  return lines.join("\n");
}
