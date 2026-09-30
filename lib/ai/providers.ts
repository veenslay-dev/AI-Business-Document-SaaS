import "server-only";
import { AiError, type AiProvider, type CompletionRequest } from "./types";

const TIMEOUT_MS = 90_000;

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: controller.signal });
    if (!res.ok) {
      // Log the status only; never the body or headers.
      console.error(`[ai] provider responded ${res.status}`);
      throw new AiError("provider_error", "provider error");
    }
    return await res.json();
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Error && e.name === "AbortError") throw new AiError("timeout", "timeout");
    throw new AiError("provider_error", "network");
  } finally {
    clearTimeout(timer);
  }
}

export function openAiProvider(apiKey: string, model: string): AiProvider {
  return {
    name: "openai",
    async complete(req: CompletionRequest) {
      const data = (await postJson(`${(process.env.OPENAI_BASE_URL ?? "https://api.openai.com").replace(/\/$/, "")}/v1/chat/completions`, { authorization: `Bearer ${apiKey}` }, {
        model, temperature: req.temperature ?? 0.6, max_tokens: req.maxTokens ?? 3000,
        ...(req.json ? { response_format: { type: "json_object" } } : {}),
        messages: [{ role: "system", content: req.system }, { role: "user", content: req.user }],
      })) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new AiError("provider_error", "empty");
      return text;
    },
  };
}

export function anthropicProvider(apiKey: string, model: string): AiProvider {
  return {
    name: "anthropic",
    async complete(req: CompletionRequest) {
      const data = (await postJson(`${(process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com").replace(/\/$/, "")}/v1/messages`, { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, {
        model, max_tokens: req.maxTokens ?? 3000, temperature: req.temperature ?? 0.6,
        system: req.json ? `${req.system}\n\nRespond with a single JSON object and nothing else.` : req.system,
        messages: [{ role: "user", content: req.user }],
      })) as { content?: { type: string; text?: string }[] };
      const text = data.content?.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
      if (!text) throw new AiError("provider_error", "empty");
      return text;
    },
  };
}

/** Picks the provider from environment variables. Keys are read on the server only. */
export function getProvider(): AiProvider {
  const choice = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  if (choice === "openai") {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new AiError("not_configured", "missing OPENAI_API_KEY");
    return openAiProvider(key, process.env.AI_MODEL_OPENAI ?? "gpt-4o-mini");
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError("not_configured", "missing ANTHROPIC_API_KEY");
  return anthropicProvider(key, process.env.AI_MODEL_ANTHROPIC ?? "claude-sonnet-4-5");
}
