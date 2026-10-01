import { z } from "zod";

export const CONTACT_TOPICS = ["general", "upgrade", "custom", "support"] as const;
export const CONTACT_PLANS = ["professional", "agency", "custom"] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  company: z.string().trim().max(160).default(""),
  phone: z.string().trim().max(40).default(""),
  topic: z.enum(CONTACT_TOPICS).default("general"),
  plan: z.enum(CONTACT_PLANS).nullable().default(null),
  workspaceId: z.string().uuid().nullable().default(null),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(4000),
  /** Honeypot. Real visitors never see or fill this. */
  website: z.string().max(200).default(""),
});
export type ContactInput = z.input<typeof contactSchema>;
