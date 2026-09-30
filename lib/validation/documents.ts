import { z } from "zod";
import { CURRENCIES, documentContentSchema } from "@/lib/documents/content";
import { proposalAiSchema } from "@/lib/ai/schemas";

export const proposalFormSchema = z.object({
  clientId: z.string().uuid("Select a client"),
  title: z.string().trim().min(3, "Give the proposal a title").max(200),
  description: z.string().trim().max(4000).default(""),
  goals: z.string().trim().max(4000).default(""),
  requirements: z.string().trim().max(4000).default(""),
  services: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  timeline: z.string().trim().max(400).default(""),
  budget: z.string().trim().max(200).default(""),
  currency: z.enum(CURRENCIES).default("INR"),
  notes: z.string().trim().max(4000).default(""),
  templateKey: z.string().max(60).default("proposal-modern"),
  templateId: z.string().uuid().nullable().default(null),
  packageIds: z.array(z.string().uuid()).max(4).default([]),
  selectedPackageId: z.string().uuid().nullable().default(null),
  /** Output of the AI step, if the user generated one. Re-validated on the server. */
  ai: proposalAiSchema.nullable().default(null),
});
export type ProposalFormInput = z.input<typeof proposalFormSchema>;

export const quotationFormSchema = z.object({
  clientId: z.string().uuid("Select a client"),
  title: z.string().trim().max(200).default(""),
  issueDate: z.string().min(8, "Choose an issue date"),
  validUntil: z.string().default(""),
  currency: z.enum(CURRENCIES).default("INR"),
  taxLabel: z.string().trim().min(1).max(30).default("GST"),
  taxRate: z.coerce.number().min(0).max(100).default(18),
  notes: z.string().trim().max(4000).default(""),
  templateKey: z.string().max(60).default("quotation-professional"),
  templateId: z.string().uuid().nullable().default(null),
});
export type QuotationFormInput = z.input<typeof quotationFormSchema>;

export const saveDocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, "Give the document a title").max(200),
  content: documentContentSchema,
  templateKey: z.string().max(60).nullable().default(null),
  templateId: z.string().uuid().nullable().default(null),
});
export type SaveDocumentInput = z.input<typeof saveDocumentSchema>;
