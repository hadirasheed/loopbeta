import "server-only";
import { buildTagPrompt, parseTagReply } from "./prompt";
import { mapProviderError, networkError } from "./errors";
import type {
  ProviderAdapter,
  PingResult,
  TagContext,
  TagResult,
  TokenUsage,
} from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
}

async function call(
  ctx: TagContext,
  body: Record<string, unknown>
): Promise<{ text: string; usage?: TokenUsage }> {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ctx.apiKey,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify({ model: ctx.model, ...body }),
    });
  } catch (e) {
    throw networkError("anthropic", e);
  }

  const raw = await res.text();
  if (!res.ok) {
    let detail: string | undefined;
    try {
      detail = (JSON.parse(raw) as AnthropicResponse).error?.message;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(mapProviderError("anthropic", res.status, detail));
  }

  let data: AnthropicResponse;
  try {
    data = JSON.parse(raw) as AnthropicResponse;
  } catch {
    throw new Error("Claude returned a non-JSON response.");
  }

  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("")
    .trim();

  const usage = data.usage
    ? {
        inputTokens: data.usage.input_tokens ?? 0,
        outputTokens: data.usage.output_tokens ?? 0,
      }
    : undefined;

  return { text, usage };
}

export const anthropicAdapter: ProviderAdapter = {
  provider: "anthropic",
  async tag(name, description, ctx): Promise<TagResult> {
    const { system, user } = buildTagPrompt(name, description);
    const { text, usage } = await call(ctx, {
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
    });
    if (!text) throw new Error("Empty reply from Claude.");
    return { ...parseTagReply(text), usage };
  },
  async ping(ctx): Promise<PingResult> {
    const start = Date.now();
    const { text, usage } = await call(ctx, {
      max_tokens: 8,
      messages: [{ role: "user", content: "Reply with the single word: ok" }],
    });
    return {
      ok: true,
      latencyMs: Date.now() - start,
      usage,
      reply: text.slice(0, 40),
    };
  },
};
