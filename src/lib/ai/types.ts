import { ATTRIBUTE_KEYS, type DishAttributes } from "@/lib/types";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface TagResult {
  attributes: DishAttributes;
  tags: string[];
  usage?: TokenUsage;
}

export interface TagContext {
  model: string;
  apiKey: string;
}

/** A successful health check against a provider + model + key. */
export interface PingResult {
  ok: true;
  latencyMs: number;
  usage?: TokenUsage;
  reply?: string;
}

/** One provider adapter. `tag`/`ping` throw with a friendly message on failure. */
export interface ProviderAdapter {
  provider: string;
  tag(
    name: string,
    description: string | null,
    ctx: TagContext
  ): Promise<TagResult>;
  ping(ctx: TagContext): Promise<PingResult>;
}

/**
 * Client-safe presentation metadata per provider — powers the setup form's
 * guidance (key placeholder, where to get a key, example model ids, docs).
 * Kept here (no server-only imports) so the settings UI can import it.
 */
export interface ProviderMeta {
  slug: string;
  name: string;
  blurb: string;
  keyPlaceholder: string;
  keyPrefixHint: string | null;
  getKeyUrl: string;
  docsUrl: string;
  defaultModel: string;
  exampleModels: string[];
}

export const PROVIDER_META: Record<string, ProviderMeta> = {
  anthropic: {
    slug: "anthropic",
    name: "Claude (Anthropic)",
    blurb: "Anthropic's Claude models. Great instruction-following for tagging.",
    keyPlaceholder: "sk-ant-…",
    keyPrefixHint: "sk-ant-",
    getKeyUrl: "https://console.anthropic.com/settings/keys",
    docsUrl: "https://docs.anthropic.com/en/docs/about-claude/models",
    defaultModel: "claude-haiku-4-5-20251001",
    exampleModels: [
      "claude-haiku-4-5-20251001",
      "claude-sonnet-5",
      "claude-opus-4-8",
    ],
  },
  openai: {
    slug: "openai",
    name: "OpenAI",
    blurb: "OpenAI GPT models via the standard chat completions API.",
    keyPlaceholder: "sk-…",
    keyPrefixHint: "sk-",
    getKeyUrl: "https://platform.openai.com/api-keys",
    docsUrl: "https://platform.openai.com/docs/models",
    defaultModel: "gpt-4o-mini",
    exampleModels: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  },
  openrouter: {
    slug: "openrouter",
    name: "OpenRouter",
    blurb: "One key, many models (Claude, GPT, Llama, …) routed through OpenRouter.",
    keyPlaceholder: "sk-or-…",
    keyPrefixHint: "sk-or-",
    getKeyUrl: "https://openrouter.ai/keys",
    docsUrl: "https://openrouter.ai/models",
    defaultModel: "anthropic/claude-3.5-haiku",
    exampleModels: [
      "anthropic/claude-3.5-haiku",
      "openai/gpt-4o-mini",
      "meta-llama/llama-3.1-70b-instruct",
    ],
  },
};

/** Human-readable provider name, falling back to the slug. */
export function providerName(slug: string): string {
  return PROVIDER_META[slug]?.name ?? slug;
}

function clamp01(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0.5;
  return Math.min(1, Math.max(0, v));
}

/**
 * Coerce a parsed model reply into a valid TagResult: every attribute clamped
 * to [0,1], tags reduced to a clean string list. Throws if the shape is
 * fundamentally wrong so the caller can flag the dish for manual tagging.
 */
export function normalizeTagResult(raw: unknown): TagResult {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Reply is not a JSON object");
  }
  const obj = raw as Record<string, unknown>;
  const rawAttrs =
    typeof obj.attributes === "object" && obj.attributes !== null
      ? (obj.attributes as Record<string, unknown>)
      : null;
  if (!rawAttrs) throw new Error("Reply is missing an attributes object");

  const attributes = Object.fromEntries(
    ATTRIBUTE_KEYS.map((k) => [k, clamp01(rawAttrs[k])])
  ) as DishAttributes;

  const tags = Array.isArray(obj.tags)
    ? Array.from(
        new Set(
          obj.tags
            .filter((t): t is string => typeof t === "string")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
        )
      ).slice(0, 12)
    : [];

  return { attributes, tags };
}
