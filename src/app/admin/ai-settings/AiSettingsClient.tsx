"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProviderView } from "@/lib/ai/providers";

export default function AiSettingsClient({
  initial,
  supported,
}: {
  initial: ProviderView[];
  supported: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [provider, setProvider] = useState(supported[0] ?? "anthropic");
  const [model, setModel] = useState("");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");

  const inputCls =
    "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/20 dark:focus:border-white";

  async function add() {
    if (!model.trim() || !apiKey.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/ai-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model, label, apiKey }),
    });
    setBusy(false);
    if (res.ok) {
      setModel("");
      setLabel("");
      setApiKey("");
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error ?? "Failed to add model.");
    }
  }

  async function patch(id: string, payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/ai-settings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error ?? "Update failed.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this model?")) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/ai-settings/${id}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError("Delete failed.");
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Existing models */}
      {initial.length === 0 ? (
        <p className="text-sm text-black/40 dark:text-white/40">
          No models yet. Add one below.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {initial.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-black/10 p-3 dark:border-white/15"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {p.label || p.model}
                  {p.is_active_for_tagging && (
                    <span className="ml-2 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-green-700 dark:text-green-400">
                      Active
                    </span>
                  )}
                </p>
                <p className="text-xs text-black/50 dark:text-white/50">
                  {p.provider} · {p.model} · key {p.has_key ? "••••••••" : "—"}
                </p>
              </div>

              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={p.is_enabled}
                  disabled={busy}
                  onChange={(e) => patch(p.id, { is_enabled: e.target.checked })}
                  className="h-4 w-4 accent-black dark:accent-white"
                />
                Enabled
              </label>

              <button
                disabled={busy || !p.is_enabled || p.is_active_for_tagging}
                onClick={() => patch(p.id, { activate: true })}
                className="rounded-full border border-black/15 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-white/20"
              >
                {p.is_active_for_tagging ? "Active" : "Set active"}
              </button>

              <button
                disabled={busy}
                onClick={() => remove(p.id)}
                className="text-xs text-red-600 disabled:opacity-50 dark:text-red-400"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add model */}
      <div className="flex flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="text-sm font-medium">Add a model</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-black/50 dark:text-white/50">
              Provider
            </span>
            <select
              className={inputCls}
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              {supported.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-black/50 dark:text-white/50">
              Model id
            </span>
            <input
              className={inputCls}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="claude-opus-4-8"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-black/50 dark:text-white/50">
              Label (optional)
            </span>
            <input
              className={inputCls}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Tagging model"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-black/50 dark:text-white/50">
              API key (write-only)
            </span>
            <input
              className={inputCls}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-…"
              autoComplete="new-password"
            />
          </label>
        </div>
        <button
          disabled={busy || !model.trim() || !apiKey.trim()}
          onClick={add}
          className="self-start rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {busy ? "Saving…" : "Add model"}
        </button>
      </div>
    </div>
  );
}
