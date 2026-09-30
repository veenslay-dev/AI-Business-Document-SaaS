import { z } from "zod";

export const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : null));

export const optionalUrl = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), {
    message: "Enter a full URL, for example https://example.com",
  });

export const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.string().email().safeParse(v).success, {
    message: "Enter a valid email address",
  });

export const companyInfoSchema = z.object({
  companyName: z.string().trim().min(2, "Enter your company name").max(120),
  tagline: optionalText(160),
  website: optionalUrl,
  email: optionalEmail,
  phone: optionalText(40),
  address: optionalText(400),
  gstNumber: optionalText(30),
  panNumber: optionalText(20),
  description: optionalText(2000),
});

export const businessInfoSchema = z.object({
  // One service per line in the form; stored as an array.
  services: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 30),
    ),
  defaultTerms: optionalText(6000),
  authorizedName: optionalText(120),
  authorizedDesignation: optionalText(120),
});

export type CompanyInfoInput = z.input<typeof companyInfoSchema>;
export type CompanyInfoOutput = z.output<typeof companyInfoSchema>;
export type BusinessInfoInput = z.input<typeof businessInfoSchema>;
export type BusinessInfoOutput = z.output<typeof businessInfoSchema>;
