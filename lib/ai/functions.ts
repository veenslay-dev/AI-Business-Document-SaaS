import type { ZodType } from "zod";
import type { BrandContext } from "@/lib/documents/branding";
import { companyContext, type KnowledgeItem } from "./context";
import { generateStructured } from "./json";
import {
  ASSIST_COMMANDS, auditAnalysisSchema, followUpSchema, improveSchema, proposalAiSchema, quotationDescriptionSchema,
  type AssistCommand, type AuditAnalysis, type ProposalAi,
} from "./schemas";
import type { AiProvider } from "./types";

/**
 * Provider-independent AI operations. Each takes a provider, so callers decide
 * which one to use (and tests pass a fake). Nothing here reads environment
 * variables or talks to the network directly.
 */

const VOICE = `You write business documents for a company. Be specific and concrete, avoid filler and marketing clichés, never invent statistics, client names, awards or results. If a fact isn't provided, leave it out rather than guessing. Use plain, confident language.`;

export type ProposalInput = {
  clientName: string; clientIndustry?: string; projectTitle: string; description: string; goals: string; requirements: string;
  services: string[]; timeline: string; budget: string; notes: string; currency: string; audience?: "us" | "india" | "global";
};

export async function generateProposal(
  provider: AiProvider, brand: BrandContext, input: ProposalInput, knowledge: KnowledgeItem[] = [],
): Promise<ProposalAi> {
  const user = `${companyContext(brand, knowledge)}

Write a proposal for this client and project.
Client: ${input.clientName}${input.clientIndustry ? ` (${input.clientIndustry})` : ""}
Project: ${input.projectTitle}
Description: ${input.description || "not provided"}
Business goals: ${input.goals || "not provided"}
Client requirements: ${input.requirements || "not provided"}
Services to include: ${input.services.join("; ") || "choose from the company's services"}
Timeline: ${input.timeline || "not specified, propose a realistic one"}
Budget: ${input.budget || "not specified"} (${input.currency})
Notes: ${input.notes || "none"}
${input.audience === "us" ? "Write for a US audience (US spelling, dollar-first framing)." : input.audience === "india" ? "Write for an Indian audience (Indian business conventions, INR, GST where relevant)." : ""}

Return one JSON object with exactly these keys:
{"title": string, "executive_summary": string, "client_challenges": string[], "objectives": string[],
 "strategy": [{"title": string, "description": string}], "deliverables": string[],
 "timeline": [{"phase": string, "duration": string, "description": string}],
 "investment": {"items": [{"name": string, "description": string, "amount": number}], "currency": "INR"|"USD"|"GBP"|"EUR", "notes": string},
 "terms": string}
Investment amounts must respect the stated budget; if no budget is given, leave "items" empty rather than inventing prices.`;
  return generateStructured(provider, proposalAiSchema, { system: VOICE, user, maxTokens: 3500 });
}

export async function generateQuotationDescription(
  provider: AiProvider, brand: BrandContext, input: { service: string; context?: string },
): Promise<string> {
  const user = `${companyContext(brand)}

Write a 1 to 2 sentence line-item description for a quotation.
Service: ${input.service}
${input.context ? `Context: ${input.context}` : ""}
Return {"description": string}.`;
  const r = await generateStructured(provider, quotationDescriptionSchema, { system: VOICE, user, maxTokens: 300 });
  return r.description;
}

export type AuditFindingInput = { id: string; category: string; issue: string; severity: string; technical: string; affectedUrl?: string };

export async function analyzeAudit(
  provider: AiProvider, brand: BrandContext, input: { url: string; clientName: string; findings: AuditFindingInput[] },
): Promise<AuditAnalysis> {
  const user = `${companyContext(brand)}

Turn these technical SEO findings for ${input.clientName} (${input.url}) into client-friendly language.
For each finding write "explanation" (why it matters to their business, no jargon, 1 to 3 sentences) and "recommendation" (the concrete fix, 1 to 3 sentences). Keep each finding's "id" unchanged. Do not add or remove findings. Also write a "summary" of 2 to 4 sentences on the overall health of the site.
Findings:
${JSON.stringify(input.findings)}
Return {"summary": string, "findings": [{"id": string, "explanation": string, "recommendation": string}]}.`;
  return generateStructured(provider, auditAnalysisSchema, { system: VOICE, user, maxTokens: 4000, temperature: 0.4 });
}

const COMMAND_PROMPTS: Record<AssistCommand, string> = {
  improve: "Improve this text: clearer, tighter, better flow. Keep the meaning and facts.",
  professional: "Rewrite this in a more professional, polished business tone. Keep the meaning and facts.",
  shorter: "Make this noticeably shorter while keeping every key point.",
  persuasive: "Make this more persuasive: lead with the client's benefit, be specific. Do not add claims that aren't in the text or company facts.",
  simplify: "Simplify this so a busy non-expert can follow it. Shorter sentences, no jargon.",
  detail: "Add useful detail and explanation. Only use facts from the text or the company facts; do not invent numbers.",
  us_clients: "Rewrite this for a US audience: US spelling, direct tone, dollar-first framing where money is mentioned.",
  indian_clients: "Rewrite this for an Indian business audience: courteous, clear, INR and GST conventions where money or tax is mentioned.",
  faq: "Write 4 to 6 likely client questions with answers based on this section and the company facts. Format as plain text: 'Q: ...' then 'A: ...', blank line between pairs.",
  deliverables: "Write a clear list of deliverables for this work, one per line, no bullets or numbering characters.",
  timeline: "Write a realistic phased timeline, one phase per line in the form 'Phase name | duration | short description'.",
  executive_summary: "Write a 2 paragraph executive summary of this document for a decision maker.",
};

export async function improveDocumentContent(
  provider: AiProvider, brand: BrandContext,
  input: { command: AssistCommand; text: string; documentTitle?: string }, knowledge: KnowledgeItem[] = [],
): Promise<string> {
  const user = `${companyContext(brand, knowledge)}

Task (${ASSIST_COMMANDS[input.command]}): ${COMMAND_PROMPTS[input.command]}
${input.documentTitle ? `Document: ${input.documentTitle}` : ""}
Text to work on:
"""
${input.text.slice(0, 6000)}
"""
Return {"content": string}. The content is plain text; use line breaks, not markdown.`;
  const r = await generateStructured(provider, improveSchema, { system: VOICE, user, maxTokens: 2000 });
  return r.content;
}

export async function generateFollowUp(
  provider: AiProvider, brand: BrandContext,
  input: { clientContact: string; documentTitle: string; status: string; daysSinceSent: number; viewed: boolean },
) {
  const user = `${companyContext(brand)}

Write a short, polite follow-up email to ${input.clientContact || "the client"} about "${input.documentTitle}".
Status: ${input.status}. Sent ${input.daysSinceSent} days ago. ${input.viewed ? "They have opened it." : "They haven't opened it yet."}
No pressure tactics. Ask if they have questions and offer a call. Sign off with the company name.
Return {"subject": string, "body": string}.`;
  return generateStructured(provider, followUpSchema as ZodType<{ subject: string; body: string }>, { system: VOICE, user, maxTokens: 700 });
}
