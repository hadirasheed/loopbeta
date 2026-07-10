import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { anthropicAdapter } from "./anthropic";
import { openaiAdapter, openrouterAdapter } from "./openai-compatible";
import type { ProviderAdapter, TagContext, TokenUsage } from "./types";

/** Provider adapters, keyed by provider slug. */
const ADAPTERS: Record<string, ProviderAdapter> = {
  anthropic: anthropicAdapter,
  openai: openaiAdapter,
  openrouter: openrouterAdapter,
};

export const SUPPORTED_PROVIDERS = Object.keys(ADAPTERS);

/** Row shape returned to the client — NEVER includes the key material. */
export interface ProviderView {
  id: string;
  provider: string;
  model: string;
  label: string | null;
  is_enabled: boolean;
  is_active_for_tagging: boolean;
  has_key: boolean;
  token_budget: number | null;
  usage: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  last_used_at: string | null;
  last_ok_at: string | null;
  last_error: string | null;
  created_at: string;
}

const SELECT_COLS =
  "id, provider, model, label, is_enabled, is_active_for_tagging, api_key_encrypted, " +
  "token_budget, usage_requests, usage_input_tokens, usage_output_tokens, " +
  "last_used_at, last_ok_at, last_error, created_at";

function toView(r: Record<string, unknown>): ProviderView {
  const inputTokens = Number(r.usage_input_tokens ?? 0);
  const outputTokens = Number(r.usage_output_tokens ?? 0);
  return {
    id: r.id as string,
    provider: r.provider as string,
    model: r.model as string,
    label: (r.label as string | null) ?? null,
    is_enabled: Boolean(r.is_enabled),
    is_active_for_tagging: Boolean(r.is_active_for_tagging),
    has_key: Boolean(r.api_key_encrypted),
    token_budget: r.token_budget == null ? null : Number(r.token_budget),
    usage: {
      requests: Number(r.usage_requests ?? 0),
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
    last_used_at: (r.last_used_at as string | null) ?? null,
    last_ok_at: (r.last_ok_at as string | null) ?? null,
    last_error: (r.last_error as string | null) ?? null,
    created_at: r.created_at as string,
  };
}

export async function listProviders(
  db: SupabaseClient
): Promise<ProviderView[]> {
  const { data, error } = await db
    .from("llm_providers")
    .select(SELECT_COLS)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) =>
    toView(r as unknown as Record<string, unknown>)
  );
}

/** Lightweight info about the active tagging model (no key) for display. */
export async function activeTaggerInfo(
  db: SupabaseClient
): Promise<{ provider: string; model: string; label: string | null } | null> {
  const { data } = await db
    .from("llm_providers")
    .select("provider, model, label")
    .eq("is_active_for_tagging", true)
    .eq("is_enabled", true)
    .maybeSingle();
  if (!data) return null;
  return {
    provider: data.provider as string,
    model: data.model as string,
    label: (data.label as string | null) ?? null,
  };
}

export async function createProvider(
  db: SupabaseClient,
  input: {
    provider: string;
    model: string;
    label?: string;
    apiKey: string;
    tokenBudget?: number | null;
  }
): Promise<{ id: string }> {
  if (!SUPPORTED_PROVIDERS.includes(input.provider)) {
    throw new Error(`Unsupported provider: ${input.provider}`);
  }
  const { data, error } = await db
    .from("llm_providers")
    .insert({
      provider: input.provider,
      model: input.model,
      label: input.label || null,
      api_key_encrypted: encryptSecret(input.apiKey),
      token_budget: input.tokenBudget ?? null,
      is_enabled: true,
      is_active_for_tagging: false,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

/** Update editable fields. `apiKey` is only touched when a new one is given. */
export async function updateProvider(
  db: SupabaseClient,
  id: string,
  input: {
    model?: string;
    label?: string;
    tokenBudget?: number | null;
    apiKey?: string;
  }
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (typeof input.model === "string" && input.model.trim()) {
    patch.model = input.model.trim();
  }
  if (input.label !== undefined) patch.label = input.label.trim() || null;
  if (input.tokenBudget !== undefined) patch.token_budget = input.tokenBudget;
  if (typeof input.apiKey === "string" && input.apiKey.trim()) {
    patch.api_key_encrypted = encryptSecret(input.apiKey.trim());
  }
  if (Object.keys(patch).length === 0) return;
  const { error } = await db.from("llm_providers").update(patch).eq("id", id);
  if (error) throw error;
}

export async function setEnabled(
  db: SupabaseClient,
  id: string,
  enabled: boolean
): Promise<void> {
  // Disabling the active model also clears its active flag.
  const patch: Record<string, unknown> = { is_enabled: enabled };
  if (!enabled) patch.is_active_for_tagging = false;
  const { error } = await db.from("llm_providers").update(patch).eq("id", id);
  if (error) throw error;
}

/** Mark exactly one enabled model active for tagging (clears the others). */
export async function setActive(
  db: SupabaseClient,
  id: string,
  active: boolean
): Promise<void> {
  if (!active) {
    const { error } = await db
      .from("llm_providers")
      .update({ is_active_for_tagging: false })
      .eq("id", id);
    if (error) throw error;
    return;
  }

  const { data: row } = await db
    .from("llm_providers")
    .select("is_enabled")
    .eq("id", id)
    .maybeSingle();
  if (!row) throw new Error("Model not found");
  if (!row.is_enabled) throw new Error("Enable the model before activating it");

  // Clear any current active first (the partial unique index allows only one).
  const { error: clearErr } = await db
    .from("llm_providers")
    .update({ is_active_for_tagging: false })
    .eq("is_active_for_tagging", true);
  if (clearErr) throw clearErr;

  const { error } = await db
    .from("llm_providers")
    .update({ is_active_for_tagging: true })
    .eq("id", id);
  if (error) throw error;
}

export async function resetUsage(
  db: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await db
    .from("llm_providers")
    .update({
      usage_requests: 0,
      usage_input_tokens: 0,
      usage_output_tokens: 0,
      last_error: null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProvider(
  db: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await db.from("llm_providers").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Add token/request usage to a provider row (read-then-write; fine at admin
 * concurrency). Also stamps success/error state for the health display.
 */
export async function recordUsage(
  db: SupabaseClient,
  id: string,
  opts: {
    usage?: TokenUsage;
    requests?: number;
    ok?: boolean;
    error?: string | null;
    isPing?: boolean;
  }
): Promise<void> {
  const { data } = await db
    .from("llm_providers")
    .select("usage_requests, usage_input_tokens, usage_output_tokens")
    .eq("id", id)
    .maybeSingle();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    usage_requests:
      Number(data?.usage_requests ?? 0) + (opts.requests ?? 1),
    usage_input_tokens:
      Number(data?.usage_input_tokens ?? 0) + (opts.usage?.inputTokens ?? 0),
    usage_output_tokens:
      Number(data?.usage_output_tokens ?? 0) + (opts.usage?.outputTokens ?? 0),
    last_used_at: now,
  };
  if (opts.ok === true) {
    patch.last_error = null;
    if (opts.isPing) patch.last_ok_at = now;
  }
  if (opts.ok === false && opts.error) {
    patch.last_error = opts.error;
  }
  await db.from("llm_providers").update(patch).eq("id", id);
}

export interface PingOutcome {
  ok: boolean;
  latencyMs?: number;
  reply?: string;
  usage?: TokenUsage;
  error?: string;
}

/** Decrypt a model's key and run a health check, recording the outcome. */
export async function pingProvider(
  db: SupabaseClient,
  id: string
): Promise<PingOutcome> {
  const { data } = await db
    .from("llm_providers")
    .select("provider, model, api_key_encrypted")
    .eq("id", id)
    .maybeSingle();
  if (!data) throw new Error("Model not found");
  if (!data.api_key_encrypted) {
    return { ok: false, error: "No API key stored for this model." };
  }
  const adapter = ADAPTERS[data.provider as string];
  if (!adapter) {
    return { ok: false, error: `Unknown provider: ${data.provider}` };
  }

  let key: string;
  try {
    key = decryptSecret(data.api_key_encrypted as string);
  } catch {
    return {
      ok: false,
      error: "Stored key couldn't be decrypted. Re-enter the API key.",
    };
  }

  try {
    const result = await adapter.ping({ model: data.model as string, apiKey: key });
    await recordUsage(db, id, {
      usage: result.usage,
      ok: true,
      isPing: true,
    });
    return {
      ok: true,
      latencyMs: result.latencyMs,
      reply: result.reply,
      usage: result.usage,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Test failed.";
    await recordUsage(db, id, { requests: 0, ok: false, error });
    return { ok: false, error };
  }
}

export interface ResolvedTagger {
  id: string;
  provider: string;
  model: string;
  adapter: ProviderAdapter;
  ctx: TagContext;
}

/**
 * Resolve the model marked active-for-tagging (and enabled), decrypt its key,
 * and pair it with its adapter. Returns null if none is configured.
 */
export async function resolveTagger(
  db: SupabaseClient
): Promise<ResolvedTagger | null> {
  const { data } = await db
    .from("llm_providers")
    .select("id, provider, model, api_key_encrypted")
    .eq("is_active_for_tagging", true)
    .eq("is_enabled", true)
    .maybeSingle();
  if (!data || !data.api_key_encrypted) return null;

  const adapter = ADAPTERS[data.provider as string];
  if (!adapter) return null;

  return {
    id: data.id as string,
    provider: data.provider as string,
    model: data.model as string,
    adapter,
    ctx: {
      model: data.model as string,
      apiKey: decryptSecret(data.api_key_encrypted as string),
    },
  };
}
