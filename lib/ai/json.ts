import type { ZodType } from "zod";
import { AiError, type AiProvider, type CompletionRequest } from "./types";

/** Pulls a JSON value out of a model reply, tolerating code fences and stray prose. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const candidate = fenced ? fenced[1] : trimmed;
  try { return JSON.parse(candidate); } catch { /* fall through to brace scan */ }
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(candidate.slice(start, end + 1)); } catch { /* invalid */ }
  }
  return undefined;
}

/**
 * Calls the provider and validates the reply against a Zod schema.
 * On invalid output it retries once, telling the model what was wrong.
 */
export async function generateStructured<T>(provider: AiProvider, schema: ZodType<T>, req: Omit<CompletionRequest, "json">): Promise<T> {
  let feedback = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await provider.complete({ ...req, json: true, user: req.user + feedback });
    const parsed = schema.safeParse(extractJson(raw));
    if (parsed.success) return parsed.data;
    const issues = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
    feedback = `\n\nYour previous reply was not valid. Problems: ${issues}. Reply again with only the corrected JSON object.`;
  }
  throw new AiError("invalid_output", "schema validation failed twice");
}
