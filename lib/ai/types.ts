export type CompletionRequest = {
  system: string;
  user: string;
  /** Ask the provider for a JSON object response. */
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
};

/** Anything that can turn a prompt into text. Swap providers without touching callers. */
export interface AiProvider {
  readonly name: "openai" | "anthropic" | (string & {});
  /** Tokens used by this provider instance so far, for cost tracking. Filled in as calls complete. */
  readonly usage: { input: number; output: number; model: string };
  complete(req: CompletionRequest): Promise<string>;
}

export type AiErrorCode = "not_configured" | "rate_limited" | "provider_error" | "invalid_output" | "timeout" | "plan_limit";

export class AiError extends Error {
  constructor(public code: AiErrorCode, message: string) {
    super(message);
    this.name = "AiError";
  }
}

/** Messages that are safe to show users. Provider details never leave the server. */
export const AI_USER_MESSAGES: Record<AiErrorCode, string> = {
  not_configured: "AI isn't set up for this deployment yet. Ask your admin to add an AI provider key.",
  rate_limited: "You've hit the AI usage limit for now. Wait a few minutes and try again.",
  provider_error: "The AI service didn't respond properly. Try again in a moment.",
  invalid_output: "The AI returned something we couldn't use. Try again, or write this part yourself.",
  timeout: "The AI took too long to respond. Try again.",
  plan_limit: "AI generation isn't included in your current plan.",
};
