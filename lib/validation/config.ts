import { z } from "zod";
import { CURRENCIES } from "@/lib/documents/content";

export const packageSchema = z.object({
  tier: z.enum(["basic", "standard", "premium", "custom"]).default("custom"),
  name: z.string().trim().min(2, "Name the package").max(80),
  description: z.string().trim().max(400).default(""),
  price: z.coerce.number().min(0, "Price can't be negative").max(1_000_000_000),
  currency: z.enum(CURRENCIES).default("INR"),
  features: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
});
export type PackageInput = z.input<typeof packageSchema>;

export const KB_TYPES = ["case_study", "service", "faq", "previous_proposal", "pricing", "testimonial", "certification", "note"] as const;
export const KB_LABELS: Record<(typeof KB_TYPES)[number], string> = {
  case_study: "Case study", service: "Service description", faq: "FAQ", previous_proposal: "Previous proposal", pricing: "Pricing information",
  testimonial: "Testimonial", certification: "Certification", note: "Note",
};
export const knowledgeSchema = z.object({
  title: z.string().trim().min(2, "Give it a title").max(160),
  type: z.enum(KB_TYPES),
  content: z.string().trim().min(10, "Add a few sentences so the AI has something to use").max(20_000),
});
export type KnowledgeInput = z.input<typeof knowledgeSchema>;

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  role: z.enum(["admin", "member"]),
});
export type InviteInput = z.input<typeof inviteSchema>;

export const templateNameSchema = z.string().trim().min(2, "Name the template").max(80);
