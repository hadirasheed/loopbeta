"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  btnAccent,
  btnGhost,
  inputCls,
} from "@/components/admin/ui";
import { Pagination, usePagination } from "@/components/admin/Pagination";

export interface RestaurantRow {
  id: string;
  name: string;
  area: string | null;
  dishCount: number;
}

export default function RestaurantsManager({ rows }: { rows: RestaurantRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newArea, setNewArea] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.area ?? "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  const pg = usePagination(filtered, 20);

  const allSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const selectedIds = filtered.filter((r) => selected.has(r.id)).map((r) => r.id);
  const selectedDishTotal = filtered
    .filter((r) => selected.has(r.id))
    .reduce((n, r) => n + r.dishCount, 0);

  function toggleAll() {
    setSelected((prev) => {
      if (filtered.every((r) => prev.has(r.id))) {
        const next = new Set(prev);
        filtered.forEach((r) => next.delete(r.id));
        return next;
      }
      return new Set([...prev, ...filtered.map((r) => r.id)]);
    });
  }
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function add() {
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
      setNewName("");
      setNewArea("");
      setAdding(false);
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error ?? "Failed to add.");
    }
  }

  async function saveEdit(id: string, name: string, area: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/restaurants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, area }),
    });
    setBusy(false);
    if (res.ok) {
      setEditing(null);
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error ?? "Failed to save.");
    }
  }

  async function removeOne(r: RestaurantRow) {
    if (
      !confirm(
        r.dishCount > 0
          ? `Delete "${r.name}"? This also deletes its ${r.dishCount} dish(es).`
          : `Delete "${r.name}"?`
      )
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/admin/restaurants/${r.id}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError("Delete failed.");
  }

  async function bulkDelete() {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Delete ${selectedIds.length} restaurant(s) and their ${selectedDishTotal} dish(es)? This can't be undone.`
      )
    )
      return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/restaurants/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds, action: "delete" }),
    });
    setBusy(false);
    if (res.ok) {
      setSelected(new Set());
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error ?? "Bulk delete failed.");
    }
  }

  function exportCsv(list: RestaurantRow[]) {
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      "name,area,dishes",
      ...list.map((r) => [r.name, r.area ?? "", r.dishCount].map(esc).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `restaurants-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <PageHeader
        title="Restaurants"
        description={`${rows.length} total`}
        actions={
          <>
            <button className={btnGhost} onClick={() => exportCsv(filtered)}>
              Export all
            </button>
            <button className={btnAccent} onClick={() => setAdding((a) => !a)}>
              + Add restaurant
            </button>
          </>
        }
      />

      {adding && (
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-black/10 bg-white p-4">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-xs text-ink/50">Name</span>
            <input
              className={inputCls}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Restaurant name"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-xs text-ink/50">Area (optional)</span>
            <input
              className={inputCls}
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              placeholder="Area"
            />
          </label>
          <button
            disabled={busy || !newName.trim()}
            onClick={add}
            className={btnAccent}
          >
            Create
          </button>
          <button className={btnGhost} onClick={() => setAdding(false)}>
            Cancel
          </button>
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search restaurants…"
          className={`${inputCls} max-w-xs`}
        />
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {selectedIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 py-2 shadow-sm">
          <span className="text-sm font-semibold text-ink">
            {selectedIds.length} selected
          </span>
          <button
            className={btnGhost}
            onClick={() =>
              exportCsv(filtered.filter((r) => selected.has(r.id)))
            }
          >
            Export
          </button>
          <button
            disabled={busy}
            onClick={bulkDelete}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            className="ml-auto text-sm text-ink/50 hover:text-ink"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase tracking-wide text-ink/40">
            <tr>
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 accent-ink"
                />
              </th>
              <th className="p-3">Name</th>
              <th className="p-3">Area</th>
              <th className="p-3">Dishes</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-ink/40">
                  No restaurants.
                </td>
              </tr>
            ) : (
              pg.pageItems.map((r) =>
                editing === r.id ? (
                  <EditRow
                    key={r.id}
                    row={r}
                    busy={busy}
                    onCancel={() => setEditing(null)}
                    onSave={(name, area) => saveEdit(r.id, name, area)}
                  />
                ) : (
                  <tr
                    key={r.id}
                    className="border-b border-black/5 last:border-0 hover:bg-black/[0.015]"
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                        className="h-4 w-4 accent-ink"
                      />
                    </td>
                    <td className="p-3 font-medium text-ink">{r.name}</td>
                    <td className="p-3 text-ink/60">{r.area ?? "—"}</td>
                    <td className="p-3 tabular-nums text-ink/60">
                      {r.dishCount}
                    </td>
                    <td className="whitespace-nowrap p-3 text-right">
                      <button
                        onClick={() => setEditing(r.id)}
                        className="text-sm font-medium text-ink/70 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeOne(r)}
                        className="ml-3 text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>

      <Pagination state={pg} unit="restaurants" />
    </div>
  );
}

function EditRow({
  row,
  busy,
  onCancel,
  onSave,
}: {
  row: RestaurantRow;
  busy: boolean;
  onCancel: () => void;
  onSave: (name: string, area: string) => void;
}) {
  const [name, setName] = useState(row.name);
  const [area, setArea] = useState(row.area ?? "");
  return (
    <tr className="border-b border-black/5 bg-black/[0.015] last:border-0">
      <td className="p-3" />
      <td className="p-3">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </td>
      <td className="p-3" colSpan={2}>
        <input
          className={inputCls}
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="Area"
        />
      </td>
      <td className="whitespace-nowrap p-3 text-right">
        <button
          disabled={busy || !name.trim()}
          onClick={() => onSave(name, area)}
          className="text-sm font-semibold text-ink hover:underline disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="ml-3 text-sm text-ink/50 hover:underline"
        >
          Cancel
        </button>
      </td>
    </tr>
  );
}
