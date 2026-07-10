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

/**
 * OpenAI-style /chat/completions adapter. Both OpenAI and OpenRouter speak this
 * shape, so they share one implementation differing only in base URL + headers.
 */
interface CompatConfig {
  provider: string;
  baseUrl: string;
  extraHeaders?: Record<string, string>;
}

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string } | string;
}

function makeAdapter(cfg: CompatConfig): ProviderAdapter {
  async function chat(
    ctx: TagContext,
    body: Record<string, unknown>
  ): Promise<{ text: string; usage?: TokenUsage }> {
    let res: Response;
    try {
      res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${ctx.apiKey}`,
          ...cfg.extraHeaders,
        },
        body: JSON.stringify({ model: ctx.model, ...body }),
      });
    } catch (e) {
      throw networkError(cfg.provider, e);
    }

    const raw = await res.text();
    if (!res.ok) {
      let detail: string | undefined;
      try {
        const j = JSON.parse(raw) as ChatResponse;
        detail = typeof j.error === "string" ? j.error : j.error?.message;
      } catch {
        /* non-JSON error body */
      }
      throw new Error(mapProviderError(cfg.provider, res.status, detail));
    }

    let data: ChatResponse;
    try {
      data = JSON.parse(raw) as ChatResponse;
    } catch {
      throw new Error("Provider returned a non-JSON response.");
    }

    const text = (data.choices?.[0]?.message?.content ?? "").trim();
    const usage = data.usage
      ? {
          inputTokens: data.usage.prompt_tokens ?? 0,
          outputTokens: data.usage.completion_tokens ?? 0,
        }
      : undefined;

    return { text, usage };
  }

  return {
    provider: cfg.provider,
    async tag(name, description, ctx): Promise<TagResult> {
      const { system, user } = buildTagPrompt(name, description);
      const { text, usage } = await chat(ctx, {
        max_tokens: 1024,
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      if (!text) throw new Error("Empty reply from the model.");
      return { ...parseTagReply(text), usage };
    },
    async ping(ctx): Promise<PingResult> {
      const start = Date.now();
      const { text, usage } = await chat(ctx, {
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
}

export const openaiAdapter = makeAdapter({
  provider: "openai",
  baseUrl: "https://api.openai.com/v1",
});

export const openrouterAdapter = makeAdapter({
  provider: "openrouter",
  baseUrl: "https://openrouter.ai/api/v1",
  extraHeaders: {
    "HTTP-Referer": "https://loop.app",
    "X-Title": "Loop admin tagging",
  },
});
