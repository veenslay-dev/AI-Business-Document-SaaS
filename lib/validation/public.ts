import { z } from "zod";

const signatureSchema = z.string().regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, "Add your signature").max(200_000, "That signature is too large");

export const acceptSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  designation: z.string().trim().max(120).default(""),
  agree: z.literal(true, { message: "You need to agree to the terms to accept" }),
  signature: signatureSchema,
});
export type AcceptInput = z.input<typeof acceptSchema>;

export const rejectSchema = z.object({ reason: z.string().trim().max(2000).default(""), name: z.string().trim().max(120).default("") });
export type RejectInput = z.input<typeof rejectSchema>;

export const changesSchema = z.object({
  comment: z.string().trim().min(5, "Tell us what you'd like changed (at least a few words)").max(3000),
  name: z.string().trim().max(120).default(""),
  email: z.string().trim().max(200).default("").refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email address"),
});
export type ChangesInput = z.input<typeof changesSchema>;
