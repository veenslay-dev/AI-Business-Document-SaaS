import type { ProposalAi } from "@/lib/ai/schemas";
import type { BrandContext } from "./branding";
import { newId, type Block, type Currency, type DocumentContent, type QuotationItem, type Section } from "./content";

export type ClientInfo = { company: string; contact: string; email: string; phone: string; address: string };

const lines = (s: string) => s.split(/\r?\n/).map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim()).filter(Boolean);
const para = (content: string): Block => ({ id: newId(), type: "paragraph", content });
const bullets = (items: string[]): Block => ({ id: newId(), type: "list", style: "bullet", items });
const section = (title: string, blocks: Block[], extra: Partial<Section> = {}): Section =>
  ({ id: newId("s"), title, hideTitle: false, pageBreakBefore: false, blocks, ...extra });

export type ProposalPackage = { name: string; price: number; description: string; features: string[]; selected?: boolean };

export type ProposalInput = {
  title: string; description: string; goals: string; requirements: string; services: string[];
  timeline: string; budget: string; notes: string; currency: Currency;
};

/**
 * Builds the default 13 part proposal. Company details come from the brand
 * context (never typed per document); the client specific parts come from the
 * AI reply when there is one, otherwise from what the user entered.
 */
export function buildProposalContent(args: {
  brand: BrandContext; client: ClientInfo; input: ProposalInput; ai: ProposalAi | null;
  packages?: ProposalPackage[]; date: string;
}): DocumentContent {
  const { brand, client, input, ai } = args;
  const co = brand.company;
  const currency = ai?.investment.currency ?? input.currency;

  const introParas = [co.description || `${co.name} helps businesses grow with practical, well-run projects.`];
  const intro = section("Company introduction", [
    para(introParas[0]),
    ...(co.services.length ? [{ id: newId(), type: "heading", level: 3, content: "What we do" } as Block, bullets(co.services)] : []),
  ]);

  const understanding = section("Our understanding of your needs", [
    para(ai?.executive_summary ?? [input.description, input.requirements].filter(Boolean).join("\n\n")),
  ]);

  const challengeItems = ai?.client_challenges ?? lines(input.requirements);
  const objectiveItems = ai?.objectives ?? lines(input.goals);

  const strategyBlocks: Block[] = ai && ai.strategy.length
    ? ai.strategy.flatMap((s): Block[] => [{ id: newId(), type: "heading", level: 3, content: s.title }, para(s.description)])
    : input.services.length ? [bullets(input.services)] : [para("")];

  const deliverables = ai?.deliverables ?? input.services;
  const timeline = ai?.timeline?.length
    ? ai.timeline
    : input.timeline ? [{ phase: "Project timeline", duration: input.timeline, description: "" }] : [];

  const rows = (ai?.investment.items ?? []).map((i) => ({ id: newId(), name: i.name, description: i.description, amount: i.amount }));
  const pricing: Block = {
    id: newId(), type: "pricing", currency, rows, note: ai?.investment.notes ?? (input.budget ? `Indicative budget: ${input.budget}` : ""),
    packages: (args.packages ?? []).map((p) => ({ id: newId(), name: p.name, price: p.price, description: p.description, features: p.features, selected: !!p.selected })),
  };

  const sections: Section[] = [
    intro,
    understanding,
    section("Current challenges", [challengeItems.length ? bullets(challengeItems) : para("")]),
    section("Objectives", [objectiveItems.length ? bullets(objectiveItems) : para("")]),
    section("Proposed strategy", strategyBlocks),
    section("Deliverables", [deliverables.length ? bullets(deliverables) : para("")]),
    section("Timeline", timeline.length ? [{ id: newId(), type: "timeline", items: timeline.map((t) => ({ id: newId(), ...t })) }] : [para("")]),
    section("Investment", [pricing], { pageBreakBefore: false }),
    section("Our process", [{ id: newId(), type: "list", style: "number", items: [
      "Discovery: we review your goals, current setup and constraints.",
      "Plan: we agree scope, milestones and who does what.",
      "Delivery: we work in short cycles and share progress as we go.",
      "Review: we check results with you and agree next steps.",
    ] }]),
    section("Why choose us", [
      para(co.tagline ? `${co.name}: ${co.tagline}` : `${co.name} is a focused team that treats your project like our own.`),
      ...(co.services.length ? [bullets(co.services.slice(0, 6))] : []),
    ]),
    section("Terms and conditions", [para(ai?.terms || co.terms || "")]),
    section("Next steps", [
      para("If this proposal looks right, accept it online or reply to this message and we'll schedule a kickoff."),
      para([co.signatory.name, co.email, co.phone].filter(Boolean).join("  ·  ")),
      { id: newId(), type: "signature", label: "Authorized signatory" },
    ]),
  ];

  return {
    version: 1,
    cover: {
      kicker: "Proposal", title: ai?.title || input.title, subtitle: input.description.slice(0, 200),
      preparedFor: client.company, preparedBy: co.name, date: args.date, reference: "",
    },
    client,
    sections,
  };
}

export function formatQuotationNumber(year: number, seq: number, prefix = "QT"): string {
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

export function buildQuotationContent(args: {
  brand: BrandContext; client: ClientInfo; number: string; issueDate: string; validUntil: string; currency: Currency;
  taxLabel: string; taxRate: number; items?: QuotationItem[]; notes?: string; title?: string;
}): DocumentContent {
  const co = args.brand.company;
  const sections: Section[] = [
    section("Items", [{
      id: newId(), type: "quotation",
      data: {
        number: args.number, issueDate: args.issueDate, validUntil: args.validUntil, currency: args.currency,
        taxLabel: args.taxLabel, taxRate: args.taxRate, taxInclusive: false, discountType: "percent", discount: 0,
        items: args.items ?? [],
      },
    }], { hideTitle: true }),
    section("Notes", [para(args.notes ?? "")]),
    section("Terms and conditions", [para(co.terms ?? "")]),
    section("Authorization", [{ id: newId(), type: "signature", label: "Authorized signatory" }], { hideTitle: true }),
  ];
  return {
    version: 1,
    cover: { kicker: "Quotation", title: args.title || "Quotation", subtitle: "", preparedFor: args.client.company, preparedBy: co.name, date: args.issueDate, reference: args.number },
    client: args.client,
    sections,
  };
}

/** First quotation block in a document, if any. Used to keep documents.total_amount in sync. */
export function findQuotation(content: DocumentContent) {
  for (const s of content.sections) for (const b of s.blocks) if (b.type === "quotation") return b.data;
  return null;
}
