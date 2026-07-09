"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ATTRIBUTE_KEYS,
  DAYPARTS,
  SEASONS,
  type AttributeKey,
  type DishAttributes,
} from "@/lib/types";

export interface ReviewDish {
  id: string;
  name: string;
  restaurantName: string;
  image_url: string | null;
  description: string | null;
  attributes: DishAttributes;
  tags: string[];
  available_dayparts: string[];
  seasons: string[];
}

const ATTR_LABELS: Record<AttributeKey, string> = {
  heaviness: "Heaviness",
  spiciness: "Spiciness",
  price_tier: "Price tier",
  healthiness: "Healthiness",
  adventurousness: "Adventurousness",
  warmth: "Warmth",
};

export default function ReviewClient({ dishes: initial }: { dishes: ReviewDish[] }) {
  const router = useRouter();
  const [dishes, setDishes] = useState(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patchLocal(id: string, patch: Partial<ReviewDish>) {
    setDishes((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
    );
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
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
      seasons: d.seasons,
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
    if (publish) {
      setDishes((prev) => prev.filter((x) => x.id !== d.id));
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(d.id);
        return n;
      });
      router.refresh();
    }
  }

  async function bulkApply(patch: Record<string, unknown>, publish = false) {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkBusy(true);
    setError(null);
    const res = await fetch("/api/admin/dishes/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, patch }),
    });
    setBulkBusy(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error ?? "Bulk update failed.");
      return;
    }
    if (publish) {
      setDishes((prev) => prev.filter((x) => !selected.has(x.id)));
      setSelected(new Set());
      router.refresh();
    } else {
      // Reflect the applied fields locally.
      setDishes((prev) =>
        prev.map((d) => (selected.has(d.id) ? { ...d, ...mapPatch(patch) } : d))
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          busy={bulkBusy}
          onSetDayparts={(vals) => bulkApply({ available_dayparts: vals })}
          onSetSeasons={(vals) => bulkApply({ seasons: vals })}
          onAddTag={(tag) => {
            // union tag into each selected dish
            const affected = dishes.filter((d) => selected.has(d.id));
            Promise.all(
              affected.map((d) =>
                fetch(`/api/admin/dishes/${d.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    tags: Array.from(new Set([...d.tags, tag])),
                  }),
                })
              )
            ).then(() => {
              setDishes((prev) =>
                prev.map((d) =>
                  selected.has(d.id)
                    ? { ...d, tags: Array.from(new Set([...d.tags, tag])) }
                    : d
                )
              );
            });
          }}
          onPublish={() => bulkApply({ status: "published" }, true)}
          onClear={() => setSelected(new Set())}
        />
      )}

      {dishes.map((d) => (
        <div
          key={d.id}
          className="rounded-2xl border border-black/10 p-4 dark:border-white/15"
        >
          <div className="mb-3 flex items-start gap-3">
            <input
              type="checkbox"
              checked={selected.has(d.id)}
              onChange={() => toggleSelect(d.id)}
              className="mt-1 h-4 w-4 accent-black dark:accent-white"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={d.image_url ?? ""}
              alt=""
              className="h-14 w-14 shrink-0 rounded-lg bg-black/5 object-cover dark:bg-white/10"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{d.name}</p>
              <p className="text-xs text-black/50 dark:text-white/50">
                {d.restaurantName}
              </p>
              {d.description && (
                <p className="mt-1 line-clamp-1 text-xs text-black/50 dark:text-white/50">
                  {d.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {ATTRIBUTE_KEYS.map((k) => (
              <label key={k} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 text-xs">{ATTR_LABELS[k]}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={d.attributes[k]}
                  onChange={(e) =>
                    patchLocal(d.id, {
                      attributes: {
                        ...d.attributes,
                        [k]: Number(e.target.value),
                      },
                    })
                  }
                  className="flex-1 accent-black dark:accent-white"
                />
                <span className="w-9 text-right text-xs tabular-nums text-black/50 dark:text-white/50">
                  {d.attributes[k].toFixed(2)}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-4">
            <ChipGroup
              title="Dayparts"
              options={DAYPARTS}
              selected={d.available_dayparts}
              onToggle={(val) =>
                patchLocal(d.id, {
                  available_dayparts: toggle(d.available_dayparts, val),
                })
              }
            />
            <ChipGroup
              title="Seasons"
              options={SEASONS}
              selected={d.seasons}
              onToggle={(val) =>
                patchLocal(d.id, { seasons: toggle(d.seasons, val) })
              }
            />
          </div>

          <TagEditor
            tags={d.tags}
            onAdd={(t) =>
              patchLocal(d.id, { tags: Array.from(new Set([...d.tags, t])) })
            }
            onRemove={(t) =>
              patchLocal(d.id, { tags: d.tags.filter((x) => x !== t) })
            }
          />

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => saveDish(d, false)}
              disabled={busyId === d.id}
              className="rounded-full border border-black/15 px-4 py-2 text-sm disabled:opacity-50 dark:border-white/20"
            >
              {busyId === d.id ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => saveDish(d, true)}
              disabled={busyId === d.id}
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              Publish
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function mapPatch(patch: Record<string, unknown>): Partial<ReviewDish> {
  const out: Partial<ReviewDish> = {};
  if (Array.isArray(patch.available_dayparts))
    out.available_dayparts = patch.available_dayparts as string[];
  if (Array.isArray(patch.seasons)) out.seasons = patch.seasons as string[];
  return out;
}

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

function ChipGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: readonly string[];
  selected: string[];
  onToggle: (val: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-black/50 dark:text-white/50">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onToggle(o)}
            className={`rounded-full border px-2.5 py-1 text-xs capitalize transition ${
              selected.includes(o)
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/15 dark:border-white/20"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
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
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-medium text-black/50 dark:text-white/50">
        Tags
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 text-xs dark:bg-white/10"
          >
            {t}
            <button
              onClick={() => onRemove(t)}
              className="text-black/40 hover:text-red-600 dark:text-white/40"
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
          className="w-24 rounded-full border border-black/15 bg-transparent px-2.5 py-1 text-xs outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
        />
      </div>
    </div>
  );
}

function BulkBar({
  count,
  busy,
  onSetDayparts,
  onSetSeasons,
  onAddTag,
  onPublish,
  onClear,
}: {
  count: number;
  busy: boolean;
  onSetDayparts: (vals: string[]) => void;
  onSetSeasons: (vals: string[]) => void;
  onAddTag: (tag: string) => void;
  onPublish: () => void;
  onClear: () => void;
}) {
  const [dayparts, setDayparts] = useState<string[]>([]);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [tag, setTag] = useState("");

  return (
    <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-2xl border border-black/10 bg-background p-4 shadow-sm dark:border-white/15">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{count} selected</span>
        <button
          onClick={onClear}
          className="text-xs text-black/50 underline underline-offset-4 dark:text-white/50"
        >
          Clear
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <ChipGroup
            title="Set dayparts (replaces)"
            options={DAYPARTS}
            selected={dayparts}
            onToggle={(v) => setDayparts(toggle(dayparts, v))}
          />
          <button
            disabled={busy}
            onClick={() => onSetDayparts(dayparts)}
            className="mt-1.5 rounded-full border border-black/15 px-3 py-1 text-xs disabled:opacity-50 dark:border-white/20"
          >
            Apply dayparts
          </button>
        </div>
        <div>
          <ChipGroup
            title="Set seasons (replaces)"
            options={SEASONS}
            selected={seasons}
            onToggle={(v) => setSeasons(toggle(seasons, v))}
          />
          <button
            disabled={busy}
            onClick={() => onSetSeasons(seasons)}
            className="mt-1.5 rounded-full border border-black/15 px-3 py-1 text-xs disabled:opacity-50 dark:border-white/20"
          >
            Apply seasons
          </button>
        </div>
        <div className="flex items-end gap-1.5">
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="add tag to all"
            className="w-36 rounded-full border border-black/15 bg-transparent px-3 py-1.5 text-xs outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
          />
          <button
            disabled={busy || !tag.trim()}
            onClick={() => {
              onAddTag(tag.trim().toLowerCase());
              setTag("");
            }}
            className="rounded-full border border-black/15 px-3 py-1.5 text-xs disabled:opacity-50 dark:border-white/20"
          >
            Add
          </button>
        </div>
      </div>

      <button
        disabled={busy}
        onClick={onPublish}
        className="self-start rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {busy ? "Working…" : `Publish ${count} selected`}
      </button>
    </div>
  );
}
