"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProviderView } from "@/lib/ai/providers";
import { PROVIDER_META, providerName } from "@/lib/ai/types";
import { btnPrimary, btnAccent, btnGhost, inputCls } from "@/components/admin/ui";

type PingState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "ok"; latencyMs?: number; reply?: string }
  | { status: "fail"; error: string };

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  const s = Math.round((Date.now() - then) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function AiSettingsClient({
  initial,
  supported,
}: {
  initial: ProviderView[];
  supported: string[];
}) {
  const active = initial.find((p) => p.is_active_for_tagging) ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Active model summary */}
      <div
        className={`rounded-xl border p-4 ${
          active
            ? "border-green-300 bg-green-50"
            : "border-amber-300 bg-amber-50"
        }`}
      >
        {active ? (
          <p className="text-sm text-ink">
            <span className="font-semibold">
              {providerName(active.provider)}
            </span>{" "}
            is powering “Pre-tag with AI”.{" "}
            <span className="text-ink/60">
              Model <code className="rounded bg-white/70 px-1">{active.model}</code>
            </span>
          </p>
        ) : (
          <p className="text-sm text-ink">
            No active tagging model yet. Add one below and switch on{" "}
            <span className="font-semibold">Use for tagging</span> — until then
            the “Pre-tag with AI” button is disabled.
          </p>
        )}
      </div>

      <ModelList initial={initial} />
      <AddModel supported={supported} />
    </div>
  );
}

function ModelList({ initial }: { initial: ProviderView[] }) {
  if (initial.length === 0) {
    return (
      <p className="rounded-xl border border-black/10 bg-white p-6 text-center text-sm text-ink/50">
        No models configured yet. Add your first one below.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {initial.map((p) => (
        <ModelCard key={p.id} p={p} />
      ))}
    </div>
  );
}

function ModelCard({ p }: { p: ProviderView }) {
  const router = useRouter();
  const meta = PROVIDER_META[p.provider];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ping, setPing] = useState<PingState>({ status: "idle" });
  const [editing, setEditing] = useState(false);

  // Edit fields.
  const [model, setModel] = useState(p.model);
  const [label, setLabel] = useState(p.label ?? "");
  const [budget, setBudget] = useState(
    p.token_budget != null ? String(p.token_budget) : ""
  );
  const [newKey, setNewKey] = useState("");

  async function patch(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/ai-settings/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
      return true;
    }
    const { error } = await res.json().catch(() => ({ error: "Failed" }));
    setError(error ?? "Update failed.");
    return false;
  }

  async function runPing() {
    setPing({ status: "running" });
    setError(null);
    try {
      const res = await fetch(`/api/admin/ai-settings/${p.id}/ping`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setPing({
          status: "ok",
          latencyMs: data.latencyMs,
          reply: data.reply,
        });
      } else {
        setPing({ status: "fail", error: data?.error ?? "Test failed." });
      }
      router.refresh(); // pick up usage / last_error changes
    } catch {
      setPing({ status: "fail", error: "Couldn't reach the server." });
    }
  }

  async function saveEdit() {
    const ok = await patch({
      model,
      label,
      tokenBudget: budget.trim() === "" ? null : Number(budget),
      ...(newKey.trim() ? { apiKey: newKey.trim() } : {}),
    });
    if (ok) {
      setEditing(false);
      setNewKey("");
    }
  }

  async function remove() {
    if (!confirm(`Remove ${p.label || p.model}?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/ai-settings/${p.id}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError("Delete failed.");
  }

  const budgetPct =
    p.token_budget && p.token_budget > 0
      ? Math.min(100, Math.round((p.usage.totalTokens / p.token_budget) * 100))
      : null;

  return (
    <div
      className={`rounded-xl border bg-white p-4 ${
        p.is_active_for_tagging ? "border-green-400" : "border-black/10"
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">
              {p.label || providerName(p.provider)}
            </span>
            {p.is_active_for_tagging && (
              <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                Active
              </span>
            )}
            {!p.is_enabled && (
              <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink/50">
                Disabled
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-ink/50">
            {providerName(p.provider)} · <code>{p.model}</code> · key{" "}
            {p.has_key ? "••••••••" : "— none"}
          </p>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-3">
          <Toggle
            label="Enabled"
            checked={p.is_enabled}
            disabled={busy}
            onChange={(v) => patch({ is_enabled: v })}
          />
          <Toggle
            label="Use for tagging"
            checked={p.is_active_for_tagging}
            disabled={busy || !p.is_enabled}
            onChange={(v) => patch({ activate: v })}
          />
        </div>
      </div>

      {/* Usage */}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat label="Requests" value={fmt(p.usage.requests)} />
        <Stat
          label="Tokens used"
          value={fmt(p.usage.totalTokens)}
          hint={`${fmt(p.usage.inputTokens)} in · ${fmt(
            p.usage.outputTokens
          )} out`}
        />
        <Stat label="Last used" value={timeAgo(p.last_used_at)} />
      </div>

      {budgetPct != null && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-ink/50">
            <span>Budget used</span>
            <span className="tabular-nums">
              {fmt(p.usage.totalTokens)} / {fmt(p.token_budget!)} tokens (
              {budgetPct}%)
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/10">
            <div
              className={`h-full rounded-full ${
                budgetPct >= 90 ? "bg-red-500" : "bg-accent"
              }`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Health line */}
      {p.last_error && ping.status === "idle" && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600">
          Last error: {p.last_error}
        </p>
      )}
      {p.last_ok_at && !p.last_error && (
        <p className="mt-2 text-xs text-green-700">
          ✓ Last test passed {timeAgo(p.last_ok_at)}
        </p>
      )}

      {/* Ping result */}
      {ping.status === "ok" && (
        <p className="mt-3 rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-700">
          ✓ Working{ping.latencyMs != null ? ` — ${ping.latencyMs}ms` : ""}
          {ping.reply ? ` · replied “${ping.reply}”` : ""}
        </p>
      )}
      {ping.status === "fail" && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600">
          ✕ {ping.error}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          className={btnPrimary}
          disabled={busy || ping.status === "running"}
          onClick={runPing}
        >
          {ping.status === "running" ? "Testing…" : "Test connection"}
        </button>
        <button
          className={btnGhost}
          disabled={busy}
          onClick={() => setEditing((e) => !e)}
        >
          {editing ? "Close" : "Edit"}
        </button>
        <button
          className={btnGhost}
          disabled={busy || p.usage.requests === 0}
          onClick={() => patch({ resetUsage: true })}
        >
          Reset usage
        </button>
        {meta && (
          <a
            href={meta.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-xs text-ink/50 underline-offset-2 hover:underline"
          >
            {providerName(p.provider)} models ↗
          </a>
        )}
        <button
          className="text-sm text-red-600 hover:underline disabled:opacity-50"
          disabled={busy}
          onClick={remove}
        >
          Remove
        </button>
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="mt-4 grid gap-3 rounded-lg border border-black/10 bg-black/[0.015] p-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-ink/50">Model id</span>
            <input
              className={inputCls}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-ink/50">Label</span>
            <input
              className={inputCls}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Tagging model"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-ink/50">
              Token budget (optional)
            </span>
            <input
              className={inputCls}
              type="number"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 1000000"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-ink/50">
              Replace API key (leave blank to keep)
            </span>
            <input
              className={inputCls}
              type="password"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder={meta?.keyPlaceholder ?? "new key"}
              autoComplete="new-password"
            />
          </label>
          <div className="sm:col-span-2">
            <button className={btnAccent} disabled={busy} onClick={saveEdit}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddModel({ supported }: { supported: string[] }) {
  const router = useRouter();
  const [provider, setProvider] = useState(supported[0] ?? "anthropic");
  const [model, setModel] = useState(
    PROVIDER_META[supported[0] ?? "anthropic"]?.defaultModel ?? ""
  );
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = PROVIDER_META[provider];

  function pickProvider(slug: string) {
    setProvider(slug);
    // Prefill a sensible default model for the chosen provider.
    setModel(PROVIDER_META[slug]?.defaultModel ?? "");
    setError(null);
  }

  async function add() {
    if (!model.trim() || !apiKey.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/ai-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        model: model.trim(),
        label: label.trim(),
        apiKey: apiKey.trim(),
        tokenBudget: budget.trim() === "" ? null : Number(budget),
      }),
    });
    setBusy(false);
    if (res.ok) {
      setModel(meta?.defaultModel ?? "");
      setLabel("");
      setApiKey("");
      setBudget("");
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error ?? "Failed to add model.");
    }
  }

  const keyLooksWrong =
    apiKey.trim() !== "" &&
    meta?.keyPrefixHint &&
    !apiKey.trim().startsWith(meta.keyPrefixHint);

  return (
    <div className="rounded-xl border border-black/10 bg-white p-5">
      <h2 className="text-sm font-semibold text-ink">Add a model</h2>
      <p className="mt-1 text-xs text-ink/50">
        Pick a provider, paste an API key, and name the model. Then hit{" "}
        <span className="font-medium">Test connection</span> to confirm it
        works before switching it on.
      </p>

      {/* Provider picker */}
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {supported.map((slug) => {
          const m = PROVIDER_META[slug];
          const selected = slug === provider;
          return (
            <button
              key={slug}
              onClick={() => pickProvider(slug)}
              className={`rounded-lg border p-3 text-left transition ${
                selected
                  ? "border-ink bg-ink/[0.03]"
                  : "border-black/15 hover:border-black/30"
              }`}
            >
              <div className="text-sm font-medium text-ink">
                {m?.name ?? slug}
              </div>
              <div className="mt-0.5 text-[11px] leading-tight text-ink/50">
                {m?.blurb}
              </div>
            </button>
          );
        })}
      </div>

      {meta && (
        <p className="mt-3 text-xs text-ink/50">
          Need a key?{" "}
          <a
            href={meta.getKeyUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-ink underline underline-offset-2"
          >
            Get one from {meta.name} ↗
          </a>
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-ink/50">Model id</span>
          <input
            className={inputCls}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={meta?.defaultModel}
          />
          {meta && meta.exampleModels.length > 0 && (
            <span className="mt-1 flex flex-wrap gap-1">
              {meta.exampleModels.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setModel(ex)}
                  className="rounded-full border border-black/15 px-2 py-0.5 text-[11px] text-ink/60 hover:border-black/30"
                >
                  {ex}
                </button>
              ))}
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-ink/50">Label (optional)</span>
          <input
            className={inputCls}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Fast tagging model"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-ink/50">API key</span>
          <input
            className={inputCls}
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={meta?.keyPlaceholder ?? "API key"}
            autoComplete="new-password"
          />
          {keyLooksWrong && (
            <span className="text-[11px] text-amber-600">
              Heads up: {meta?.name} keys usually start with “
              {meta?.keyPrefixHint}”.
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-ink/50">
            Token budget (optional, for the % meter)
          </span>
          <input
            className={inputCls}
            type="number"
            min="0"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g. 1000000"
          />
        </label>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        disabled={busy || !model.trim() || !apiKey.trim()}
        onClick={add}
        className={`mt-4 ${btnAccent}`}
      >
        {busy ? "Saving…" : "Add model"}
      </button>
      <p className="mt-2 text-[11px] text-ink/40">
        Keys are encrypted at rest and never shown again after saving.
      </p>
    </div>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center gap-2 text-xs ${
        disabled ? "opacity-50" : "cursor-pointer"
      }`}
    >
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
          checked ? "bg-green-500" : "bg-black/20"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-ink/70">{label}</span>
    </label>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-black/10 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-ink/40">
        {label}
      </div>
      <div className="text-sm font-semibold text-ink">{value}</div>
      {hint && <div className="text-[11px] text-ink/45">{hint}</div>}
    </div>
  );
}
