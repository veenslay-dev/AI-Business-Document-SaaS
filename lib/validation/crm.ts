import { z } from "zod";
import { optionalEmail, optionalText, optionalUrl } from "./company";

export const clientSchema = z.object({
  companyName: z.string().trim().min(2, "Enter the client's company name").max(160),
  contactName: optionalText(120),
  email: optionalEmail,
  phone: optionalText(40),
  website: optionalUrl,
  industry: optionalText(80),
  address: optionalText(400),
  gstNumber: optionalText(30),
  notes: optionalText(4000),
});
export type ClientInput = z.input<typeof clientSchema>;
export type ClientOutput = z.output<typeof clientSchema>;

export const PROJECT_STATUSES = ["planned", "active", "on_hold", "completed", "cancelled"] as const;
export const projectSchema = z.object({
  clientId: z.string().uuid("Choose a client"),
  name: z.string().trim().min(2, "Give the project a name").max(160),
  description: optionalText(4000),
  status: z.enum(PROJECT_STATUSES),
});
export type ProjectInput = z.input<typeof projectSchema>;
export type ProjectOutput = z.output<typeof projectSchema>;

export const uuid = z.string().uuid();
