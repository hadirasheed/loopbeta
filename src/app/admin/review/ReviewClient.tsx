"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_GUIDE,
  attributeExample,
  DAYPARTS,
  type DishAttributes,
} from "@/lib/types";
import { providerName } from "@/lib/ai/types";
import { Pagination, usePagination } from "@/components/admin/Pagination";

export interface ActiveModel {
  provider: string;
  model: string;
  label: string | null;
}
import { btnAccent, btnGhost, inputCls } from "@/components/admin/ui";

export interface ReviewDish {
  id: string;
  name: string;
  restaurantName: string;
  image_url: string | null;
  description: string | null;
  attributes: DishAttributes;
  tags: string[];
  available_dayparts: string[];
}

function clamp01(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
function toggleArr(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

export default function ReviewClient({
  dishes: initial,
  activeModel,
}: {
  dishes: ReviewDish[];
  activeModel: ActiveModel | null;
}) {
  const router = useRouter();
  const [dishes, setDishes] = useState(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkTag, setBulkTag] = useState("");
  const pg = usePagination(dishes, 20);

  const allSelected = dishes.length > 0 && dishes.every((d) => selected.has(d.id));

  function patchLocal(id: string, patch: Partial<ReviewDish>) {
    setDishes((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(dishes.map((d) => d.id)));
  }
  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveDish(d: ReviewDish, publish = false) {
    setBusyId(d.id);
    setError(null);
    const body: Record<string, unknown> = {
      attributes: d.attributes,
      tags: d.tags,
      available_dayparts: d.available_dayparts,
    };
    if (publish) body.status = "published";
    const res = await fetch(`/api/admin/dishes/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusyId(null);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error ?? "Save failed.");
      return;
    }
    if (publish) removeLocal([d.id]);
  }

  function removeLocal(ids: string[]) {
    const set = new Set(ids);
    setDishes((prev) => prev.filter((x) => !set.has(x.id)));
    setSelected((prev) => {
      const n = new Set(prev);
      ids.forEach((id) => n.delete(id));
      return n;
    });
    router.refresh();
  }

  const selectedIds = () => [...selected];

  async function preTag() {
    const ids = selectedIds();
    if (ids.length === 0) return;
    setBulkBusy(true);
    setError(null);
    const res = await fetch("/api/admin/tag-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setBulkBusy(false);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      setError(data?.error ?? "Tagging failed.");
      return;
    }
    const byId = new Map<string, { attributes?: DishAttributes; tags?: string[] }>();
    for (const r of data.results as {
      id: string;
      ok: boolean;
      attributes?: DishAttributes;
      tags?: string[];
    }[]) {
      if (r.ok && r.attributes) byId.set(r.id, r);
    }
    setDishes((prev) =>
      prev.map((d) => {
        const r = byId.get(d.id);
        return r?.attributes
          ? { ...d, attributes: r.attributes, tags: r.tags ?? d.tags }
          : d;
      })
    );
    if (data.failed > 0) {
      setError(`${data.failed} dish(es) couldn't be auto-tagged — tag them manually.`);
    }
  }

  async function bulkPublish() {
    const ids = selectedIds();
    if (ids.length === 0) return;
    setBulkBusy(true);
    setError(null);
    const res = await fetch("/api/admin/dishes/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, patch: { status: "published" } }),
    });
    setBulkBusy(false);
    if (res.ok) removeLocal(ids);
    else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error ?? "Publish failed.");
    }
  }

  async function bulkSetDayparts(vals: string[]) {
    const ids = selectedIds();
    if (ids.length === 0) return;
    setBulkBusy(true);
    setError(null);
    const res = await fetch("/api/admin/dishes/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, patch: { available_dayparts: vals } }),
    });
    setBulkBusy(false);
    if (res.ok) {
      setDishes((prev) =>
        prev.map((d) =>
          selected.has(d.id) ? { ...d, available_dayparts: vals } : d
        )
      );
    } else setError("Bulk update failed.");
  }

  async function bulkAddTag() {
    const tag = bulkTag.trim().toLowerCase();
    if (!tag) return;
    const affected = dishes.filter((d) => selected.has(d.id));
    setBulkBusy(true);
    await Promise.all(
      affected.map((d) =>
        fetch(`/api/admin/dishes/${d.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: Array.from(new Set([...d.tags, tag])) }),
        })
      )
    );
    setBulkBusy(false);
    setDishes((prev) =>
      prev.map((d) =>
        selected.has(d.id)
          ? { ...d, tags: Array.from(new Set([...d.tags, tag])) }
          : d
      )
    );
    setBulkTag("");
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Active tagging model banner */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs">
        {activeModel ? (
          <span className="text-ink/60">
            🤖 Pre-tagging uses{" "}
            <span className="font-semibold text-ink">
              {providerName(activeModel.provider)}
            </span>{" "}
            · <code className="rounded bg-black/[0.04] px-1">{activeModel.model}</code>
          </span>
        ) : (
          <span className="text-amber-700">
            No AI model is active — “Pre-tag with AI” is unavailable.
          </span>
        )}
        <Link
          href="/admin/ai-settings"
          className="ml-auto font-medium text-ink/60 underline-offset-2 hover:underline"
        >
          {activeModel ? "Change model" : "Set one up"} →
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2">
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 accent-ink"
          />
          Select all
        </label>
        <span className="text-sm text-ink/50">{selected.size} selected</span>

        {selected.size > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              className={btnGhost}
              disabled={bulkBusy || !activeModel}
              title={activeModel ? undefined : "Set an active AI model first"}
              onClick={preTag}
            >
              {bulkBusy ? "Working…" : "✨ Pre-tag with AI"}
            </button>
            <DaypartMenu disabled={bulkBusy} onApply={bulkSetDayparts} />
            <div className="flex items-center gap-1">
              <input
                value={bulkTag}
                onChange={(e) => setBulkTag(e.target.value)}
                placeholder="tag all"
                className="w-28 rounded-lg border border-black/15 px-2 py-1.5 text-sm outline-none focus:border-ink/40"
              />
              <button
                className={btnGhost}
                disabled={bulkBusy || !bulkTag.trim()}
                onClick={bulkAddTag}
              >
                Add
              </button>
            </div>
            <button className={btnAccent} disabled={bulkBusy} onClick={bulkPublish}>
              Publish {selected.size}
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        {pg.pageItems.map((d) => {
          const open = expanded.has(d.id);
          const tagged = ATTRIBUTE_KEYS.some((k) => d.attributes[k] !== 0.5);
          return (
            <div key={d.id} className="border-b border-black/5 last:border-0">
              {/* compact row */}
              <div className="flex items-center gap-3 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={selected.has(d.id)}
                  onChange={() => toggleSelect(d.id)}
                  className="h-4 w-4 accent-ink"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.image_url ?? ""}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-md bg-black/5 object-cover"
                />
                <button
                  onClick={() => toggleExpand(d.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {d.name}
                    </span>
                    <span className="block truncate text-xs text-ink/50">
                      {d.restaurantName}
                    </span>
                  </span>
                  {!tagged && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      Untagged
                    </span>
                  )}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`shrink-0 text-ink/40 transition ${open ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <button
                  onClick={() => saveDish(d, true)}
                  disabled={busyId === d.id}
                  className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Publish
                </button>
              </div>

              {/* expanded detail */}
              {open && (
                <div className="border-t border-black/5 bg-black/[0.015] px-4 py-4">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink/40">
                    Taste weights (0–1)
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {ATTRIBUTE_KEYS.map((k) => (
                      <label key={k} className="flex flex-col gap-1 text-sm">
                        <span
                          className="text-xs text-ink/60"
                          title={`0 = ${ATTRIBUTE_GUIDE[k].low} · 1 = ${ATTRIBUTE_GUIDE[k].high}`}
                        >
                          {ATTRIBUTE_GUIDE[k].label}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.05"
                          value={d.attributes[k]}
                          onChange={(e) =>
                            patchLocal(d.id, {
                              attributes: {
                                ...d.attributes,
                                [k]: clamp01(e.target.value),
                              },
                            })
                          }
                          className={inputCls}
                        />
                        <span className="text-[11px] leading-tight text-ink/45">
                          {d.attributes[k].toFixed(2)} —{" "}
                          {attributeExample(k, d.attributes[k])}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/40">
                      Dayparts (empty = any time)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYPARTS.map((dp) => (
                        <button
                          key={dp}
                          onClick={() =>
                            patchLocal(d.id, {
                              available_dayparts: toggleArr(
                                d.available_dayparts,
                                dp
                              ),
                            })
                          }
                          className={`rounded-full border px-3 py-1 text-xs capitalize transition ${
                            d.available_dayparts.includes(dp)
                              ? "border-ink bg-ink text-white"
                              : "border-black/15 text-ink/70"
                          }`}
                        >
                          {dp}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/40">
                      Tags
                    </div>
                    <TagEditor
                      tags={d.tags}
                      onAdd={(t) =>
                        patchLocal(d.id, {
                          tags: Array.from(new Set([...d.tags, t])),
                        })
                      }
                      onRemove={(t) =>
                        patchLocal(d.id, { tags: d.tags.filter((x) => x !== t) })
                      }
                    />
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => saveDish(d, false)}
                      disabled={busyId === d.id}
                      className={btnGhost}
                    >
                      {busyId === d.id ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => saveDish(d, true)}
                      disabled={busyId === d.id}
                      className={btnAccent}
                    >
                      Save & publish
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Pagination state={pg} unit="dishes" />
    </div>
  );
}

function DaypartMenu({
  disabled,
  onApply,
}: {
  disabled: boolean;
  onApply: (vals: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<string[]>([]);
  return (
    <div className="relative">
      <button className={btnGhost} disabled={disabled} onClick={() => setOpen((o) => !o)}>
        Set dayparts
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-black/10 bg-white p-3 shadow-lg">
          <div className="flex flex-wrap gap-1.5">
            {DAYPARTS.map((dp) => (
              <button
                key={dp}
                onClick={() => setVals((v) => toggleArr(v, dp))}
                className={`rounded-full border px-2.5 py-1 text-xs capitalize ${
                  vals.includes(dp)
                    ? "border-ink bg-ink text-white"
                    : "border-black/15 text-ink/70"
                }`}
              >
                {dp}
              </button>
            ))}
          </div>
          <button
            className="mt-2 w-full rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white"
            onClick={() => {
              onApply(vals);
              setOpen(false);
            }}
          >
            Apply to selected
          </button>
        </div>
      )}
    </div>
  );
}

function TagEditor({
  tags,
  onAdd,
  onRemove,
}: {
  tags: string[];
  onAdd: (t: string) => void;
  onRemove: (t: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 text-xs"
        >
          {t}
          <button
            onClick={() => onRemove(t)}
            className="text-ink/40 hover:text-red-600"
          >
            ✕
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const t = draft.trim().toLowerCase();
            if (t) onAdd(t);
            setDraft("");
          }
        }}
        placeholder="+ tag"
        className="w-24 rounded-full border border-black/15 px-2.5 py-1 text-xs outline-none focus:border-ink/40"
      />
    </div>
  );
}
