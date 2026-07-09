import { ATTRIBUTE_KEYS, type DishAttributes } from "@/lib/types";

export interface TagResult {
  attributes: DishAttributes;
  tags: string[];
}

export interface TagContext {
  model: string;
  apiKey: string;
}

/** One provider adapter. `tag` throws on a malformed/unusable reply. */
export interface ProviderAdapter {
  provider: string;
  tag(
    name: string,
    description: string | null,
    ctx: TagContext
  ): Promise<TagResult>;
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
