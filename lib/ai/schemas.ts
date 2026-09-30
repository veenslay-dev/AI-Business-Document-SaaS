import { z } from "zod";

const str = (max = 3000) => z.string().trim().max(max);
const list = (max = 20, item = 800) => z.array(str(item).min(1)).max(max);

/** Structured proposal content the model must return. */
export const proposalAiSchema = z.object({
  title: str(200).min(1),
  executive_summary: str(3000).min(1),
  client_challenges: list(),
  objectives: list(),
  strategy: z.array(z.object({ title: str(160).min(1), description: str(1500).min(1) })).max(12),
  deliverables: list(30),
  timeline: z.array(z.object({ phase: str(120).min(1), duration: str(60).default(""), description: str(800).default("") })).max(15),
  investment: z.object({
    items: z.array(z.object({ name: str(200).min(1), description: str(400).default(""), amount: z.coerce.number().min(0) })).max(20).default([]),
    currency: z.enum(["INR", "USD", "GBP", "EUR"]).optional(),
    notes: str(800).default(""),
  }).default({ items: [], notes: "" }),
  terms: str(6000).default(""),
});
export type ProposalAi = z.infer<typeof proposalAiSchema>;

export const quotationDescriptionSchema = z.object({ description: str(600).min(1) });

export const auditAnalysisSchema = z.object({
  summary: str(1500).min(1),
  findings: z.array(z.object({
    id: str(60).min(1),
    explanation: str(1200).min(1),
    recommendation: str(1200).min(1),
  })).max(100),
});
export type AuditAnalysis = z.infer<typeof auditAnalysisSchema>;

export const improveSchema = z.object({ content: str(6000).min(1) });
export const followUpSchema = z.object({ subject: str(200).min(1), body: str(3000).min(1) });

/** Assistant commands available in the document editor. */
export const ASSIST_COMMANDS = {
  improve: "Improve this section",
  professional: "Make this more professional",
  shorter: "Make this shorter",
  persuasive: "Make this more persuasive",
  simplify: "Simplify this",
  detail: "Add more detail",
  us_clients: "Rewrite for US clients",
  indian_clients: "Rewrite for Indian clients",
  faq: "Generate FAQ",
  deliverables: "Generate deliverables",
  timeline: "Generate timeline",
  executive_summary: "Generate executive summary",
} as const;
export type AssistCommand = keyof typeof ASSIST_COMMANDS;
export const assistCommandSchema = z.enum(Object.keys(ASSIST_COMMANDS) as [AssistCommand, ...AssistCommand[]]);
