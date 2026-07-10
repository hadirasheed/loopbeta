"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Restaurant } from "@/lib/types";
import { Pagination, usePagination } from "@/components/admin/Pagination";

interface ParsedItem {
  index: number;
  raw: Record<string, string>;
  data: {
    name: string;
    price: number | null;
    cuisine: string | null;
    dayparts: string[];
    delivery_apps: { app: string; url: string }[];
  };
  errors: string[];
  warnings: string[];
}

interface ParseResponse {
  items: ParsedItem[];
  total: number;
  validCount: number;
  invalidCount: number;
}

export default function ImportClient({
  restaurants,
}: {
  restaurants: Restaurant[];
}) {
  const router = useRouter();
  const [list, setList] = useState(restaurants);
  const [restaurantId, setRestaurantId] = useState("");
  const [newRestaurant, setNewRestaurant] = useState(false);
  const [newName, setNewName] = useState("");
  const [newArea, setNewArea] = useState("");

  const [parsed, setParsed] = useState<ParseResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ imported: number; skipped: number } | null>(
    null
  );
  const pg = usePagination(parsed?.items ?? [], 25);

  async function createRestaurant() {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, area: newArea }),
    });
    setBusy(false);
    if (res.ok) {
      const r = (await res.json()) as Restaurant;
      setList((prev) =>
        [...prev, r].sort((a, b) => a.name.localeCompare(b.name))
      );
      setRestaurantId(r.id);
      setNewRestaurant(false);
      setNewName("");
      setNewArea("");
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error ?? "Failed to create restaurant.");
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setDone(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/import/parse", {
      method: "POST",
      body: form,
    });
    setBusy(false);
    e.target.value = ""; // allow re-uploading the same file
    if (res.ok) {
      setParsed((await res.json()) as ParseResponse);
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error ?? "Failed to parse file.");
    }
  }

  async function commit() {
    if (!parsed || !restaurantId) return;
    const validRaw = parsed.items
      .filter((it) => it.errors.length === 0)
      .map((it) => it.raw);
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurant_id: restaurantId, rows: validRaw }),
    });
    setBusy(false);
    if (res.ok) {
      const result = (await res.json()) as { imported: number; skipped: number };
      setDone(result);
      setParsed(null);
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error ?? "Import failed.");
    }
  }

  const inputCls =
    "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/20 dark:focus:border-white";

  return (
    <div className="flex flex-col gap-6">
      {/* Step 1: restaurant */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">1. Restaurant</h2>
        {!newRestaurant ? (
          <div className="flex gap-2">
            <select
              className={inputCls}
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
            >
              <option value="">Select a restaurant…</option>
              {list.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.area ? ` (${r.area})` : ""}
                </option>
              ))}
            </select>
            <button
              onClick={() => setNewRestaurant(true)}
              className="shrink-0 rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20"
            >
              + New
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-lg border border-black/15 p-3 dark:border-white/20">
            <input
              className={inputCls}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New restaurant name"
            />
            <input
              className={inputCls}
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              placeholder="Area (optional)"
            />
            <div className="flex gap-2">
              <button
                onClick={createRestaurant}
                disabled={busy || !newName.trim()}
                className="rounded-lg bg-black px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                Create
              </button>
              <button
                onClick={() => setNewRestaurant(false)}
                className="px-3 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Step 2: template + upload */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">2. Upload spreadsheet</h2>
        <a
          href="/api/admin/import/template"
          className="self-start rounded-lg border border-black/15 px-4 py-2 text-sm dark:border-white/20"
        >
          ↓ Download .xlsx template
        </a>
        <p className="text-xs text-black/50 dark:text-white/50">
          Columns: name, price, description, image_url, cuisine, main_protein,
          prep_style, dayparts, delivery_apps, then the 6 weight columns
          (heaviness, spiciness, price_tier, healthiness, adventurousness,
          warmth). Weights are optional 0–1 numbers — leave blank for 0.5 and
          set them later in review. Dayparts are comma-separated; delivery_apps
          are &quot;app url&quot; pairs separated by &quot;;&quot;.
        </p>
        <label
          className={`self-start rounded-lg px-4 py-2 text-sm font-medium ${
            restaurantId
              ? "cursor-pointer bg-black text-white dark:bg-white dark:text-black"
              : "cursor-not-allowed bg-black/20 text-white/70 dark:bg-white/20"
          }`}
        >
          {busy ? "Working…" : "Choose .xlsx file"}
          <input
            type="file"
            accept=".xlsx"
            className="hidden"
            disabled={!restaurantId || busy}
            onChange={onFile}
          />
        </label>
        {!restaurantId && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Pick a restaurant first.
          </p>
        )}
      </section>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {done && (
        <div className="rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          Imported {done.imported} dish{done.imported === 1 ? "" : "es"} as
          drafts
          {done.skipped > 0 ? `, skipped ${done.skipped}` : ""}.{" "}
          <Link href="/admin/review" className="underline underline-offset-4">
            Go to review →
          </Link>
        </div>
      )}

      {/* Step 3: preview */}
      {parsed && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">
            3. Preview — {parsed.validCount} valid, {parsed.invalidCount} with
            errors
          </h2>
          <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-black/10 text-black/50 dark:border-white/15 dark:text-white/50">
                <tr>
                  <th className="p-2">Row</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Price</th>
                  <th className="p-2">Dayparts</th>
                  <th className="p-2">Issues</th>
                </tr>
              </thead>
              <tbody>
                {pg.pageItems.map((it) => (
                  <tr
                    key={it.index}
                    className={`border-b border-black/5 dark:border-white/10 ${
                      it.errors.length ? "bg-red-500/5" : ""
                    }`}
                  >
                    <td className="p-2 tabular-nums text-black/40 dark:text-white/40">
                      {it.index}
                    </td>
                    <td className="p-2 font-medium">{it.data.name || "—"}</td>
                    <td className="p-2 tabular-nums">{it.data.price ?? "—"}</td>
                    <td className="p-2">{it.data.dayparts.join(", ") || "any"}</td>
                    <td className="p-2">
                      {it.errors.map((e) => (
                        <span key={e} className="block text-red-600 dark:text-red-400">
                          {e}
                        </span>
                      ))}
                      {it.warnings.map((w) => (
                        <span key={w} className="block text-amber-600 dark:text-amber-400">
                          {w}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination state={pg} unit="rows" />
          <button
            onClick={commit}
            disabled={busy || parsed.validCount === 0 || !restaurantId}
            className="self-start rounded-full bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {busy
              ? "Importing…"
              : `Import ${parsed.validCount} as drafts`}
          </button>
        </section>
      )}
    </div>
  );
}
