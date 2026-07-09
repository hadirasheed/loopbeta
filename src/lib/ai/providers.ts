import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { anthropicAdapter } from "./anthropic";
import type { ProviderAdapter, TagContext } from "./types";

/** Provider adapters, keyed by provider slug. Ship Anthropic to start. */
const ADAPTERS: Record<string, ProviderAdapter> = {
  anthropic: anthropicAdapter,
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
  created_at: string;
}

export async function listProviders(
  db: SupabaseClient
): Promise<ProviderView[]> {
  const { data, error } = await db
    .from("llm_providers")
    .select(
      "id, provider, model, label, is_enabled, is_active_for_tagging, api_key_encrypted, created_at"
    )
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    provider: r.provider,
    model: r.model,
    label: r.label,
    is_enabled: r.is_enabled,
    is_active_for_tagging: r.is_active_for_tagging,
    has_key: Boolean(r.api_key_encrypted),
    created_at: r.created_at,
  }));
}

export async function createProvider(
  db: SupabaseClient,
  input: { provider: string; model: string; label?: string; apiKey: string }
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
      is_enabled: true,
      is_active_for_tagging: false,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
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
  id: string
): Promise<void> {
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

export async function deleteProvider(
  db: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await db.from("llm_providers").delete().eq("id", id);
  if (error) throw error;
}

export interface ResolvedTagger {
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
    .select("provider, model, api_key_encrypted")
    .eq("is_active_for_tagging", true)
    .eq("is_enabled", true)
    .maybeSingle();
  if (!data || !data.api_key_encrypted) return null;

  const adapter = ADAPTERS[data.provider];
  if (!adapter) return null;

  return {
    adapter,
    ctx: { model: data.model, apiKey: decryptSecret(data.api_key_encrypted) },
  };
}
