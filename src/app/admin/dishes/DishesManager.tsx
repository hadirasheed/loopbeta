"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Restaurant } from "@/lib/types";
import { PageHeader, btnAccent, btnGhost, inputCls } from "@/components/admin/ui";

export interface DishRow {
  id: string;
  name: string;
  price: number | null;
  cuisine: string | null;
  main_protein: string | null;
  image_url: string | null;
  status: "published" | "draft";
  is_veg: boolean;
  is_halal: boolean;
  restaurant_id: string;
  restaurantName: string;
}

type StatusFilter = "all" | "published" | "draft";
type DietFilter = "all" | "veg" | "halal";
type Sort = "name-asc" | "name-desc" | "price-asc" | "price-desc";
type View = "list" | "grid";

export default function DishesManager({
  dishes,
  restaurants,
}: {
  dishes: DishRow[];
  restaurants: Restaurant[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [restaurant, setRestaurant] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [diet, setDiet] = useState<DietFilter>("all");
  const [sort, setSort] = useState<Sort>("name-asc");
  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cuisines = useMemo(
    () =>
      Array.from(
        new Set(dishes.map((d) => d.cuisine).filter(Boolean) as string[])
      ).sort(),
    [dishes]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = dishes.filter((d) => {
      if (status !== "all" && d.status !== status) return false;
      if (restaurant && d.restaurant_id !== restaurant) return false;
      if (cuisine && d.cuisine !== cuisine) return false;
      if (diet === "veg" && !d.is_veg) return false;
      if (diet === "halal" && !d.is_halal) return false;
      if (q) {
        return (
          d.name.toLowerCase().includes(q) ||
          d.restaurantName.toLowerCase().includes(q) ||
          (d.cuisine ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
    out = [...out].sort((a, b) => {
      switch (sort) {
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc":
          return (a.price ?? 0) - (b.price ?? 0);
        case "price-desc":
          return (b.price ?? 0) - (a.price ?? 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return out;
  }, [dishes, query, status, restaurant, cuisine, diet, sort]);

  const allSelected =
    filtered.length > 0 && filtered.every((d) => selected.has(d.id));

  function toggleAll() {
    setSelected((prev) => {
      if (filtered.every((d) => prev.has(d.id))) {
        const next = new Set(prev);
        filtered.forEach((d) => next.delete(d.id));
        return next;
      }
      return new Set([...prev, ...filtered.map((d) => d.id)]);
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

  const selectedIds = filtered.filter((d) => selected.has(d.id)).map((d) => d.id);

  async function bulk(body: Record<string, unknown>, confirmMsg?: string) {
    if (selectedIds.length === 0) return;
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/dishes/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds, ...body }),
    });
    setBusy(false);
    if (res.ok) {
      setSelected(new Set());
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error ?? "Bulk action failed.");
    }
  }

  async function removeOne(d: DishRow) {
    if (!confirm(`Delete "${d.name}"?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/dishes/${d.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError("Delete failed.");
  }

  function exportCsv(rows: DishRow[]) {
    const header = [
      "name",
      "restaurant",
      "cuisine",
      "main_protein",
      "price",
      "status",
      "vegetarian",
      "halal",
    ];
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      header.join(","),
      ...rows.map((d) =>
        [
          d.name,
          d.restaurantName,
          d.cuisine ?? "",
          d.main_protein ?? "",
          d.price ?? "",
          d.status,
          d.is_veg ? "yes" : "no",
          d.is_halal ? "yes" : "no",
        ]
          .map(esc)
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dishes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <PageHeader
        title="Dishes"
        description={`${dishes.length} total · ${filtered.length} shown`}
        actions={
          <>
            <button className={btnGhost} onClick={() => exportCsv(filtered)}>
              Export all
            </button>
            <Link href="/admin/import" className={btnGhost}>
              Import
            </Link>
            <Link href="/admin/dishes/new" className={btnAccent}>
              + Add dish
            </Link>
          </>
        }
      />

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search dishes…"
          className={`${inputCls} max-w-xs flex-1`}
        />
        <Select value={status} onChange={(v) => setStatus(v as StatusFilter)}>
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </Select>
        <Select value={restaurant} onChange={setRestaurant}>
          <option value="">All restaurants</option>
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
        <Select value={cuisine} onChange={setCuisine}>
          <option value="">All cuisines</option>
          {cuisines.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={diet} onChange={(v) => setDiet(v as DietFilter)}>
          <option value="all">Any diet</option>
          <option value="veg">Vegetarian</option>
          <option value="halal">Halal</option>
        </Select>
        <Select value={sort} onChange={(v) => setSort(v as Sort)}>
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
        </Select>
        <div className="ml-auto flex overflow-hidden rounded-lg border border-black/15">
          <ViewBtn active={view === "list"} onClick={() => setView("list")}>
            List
          </ViewBtn>
          <ViewBtn active={view === "grid"} onClick={() => setView("grid")}>
            Grid
          </ViewBtn>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Bulk bar */}
      {selectedIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 py-2 shadow-sm">
          <span className="text-sm font-semibold text-ink">
            {selectedIds.length} selected
          </span>
          <button
            disabled={busy}
            className={btnGhost}
            onClick={() => bulk({ patch: { status: "published" } })}
          >
            Publish
          </button>
          <button
            disabled={busy}
            className={btnGhost}
            onClick={() => bulk({ patch: { status: "draft" } })}
          >
            Unpublish
          </button>
          <button
            disabled={busy}
            className={btnGhost}
            onClick={() =>
              exportCsv(filtered.filter((d) => selected.has(d.id)))
            }
          >
            Export
          </button>
          <button
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            onClick={() =>
              bulk(
                { action: "delete" },
                `Delete ${selectedIds.length} dish(es)? This can't be undone.`
              )
            }
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

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-black/10 bg-white py-12 text-center text-sm text-ink/40">
          No dishes match your filters.
        </p>
      ) : view === "list" ? (
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
                <th className="p-3">Dish</th>
                <th className="p-3">Restaurant</th>
                <th className="p-3">Cuisine</th>
                <th className="p-3">Price</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-black/5 last:border-0 hover:bg-black/[0.015]"
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(d.id)}
                      onChange={() => toggle(d.id)}
                      className="h-4 w-4 accent-ink"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Thumb src={d.image_url} />
                      <span className="font-medium text-ink">{d.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-ink/60">{d.restaurantName}</td>
                  <td className="p-3 text-ink/60">{d.cuisine ?? "—"}</td>
                  <td className="p-3 tabular-nums text-ink/60">
                    {d.price ?? "—"}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/dishes/${d.id}`}
                      className="text-sm font-medium text-ink/70 underline-offset-2 hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => removeOne(d)}
                      className="ml-3 text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((d) => (
            <div
              key={d.id}
              className={`overflow-hidden rounded-xl border bg-white ${
                selected.has(d.id) ? "border-ink" : "border-black/10"
              }`}
            >
              <div className="relative aspect-[4/3] bg-black/5">
                {d.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={d.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
                <input
                  type="checkbox"
                  checked={selected.has(d.id)}
                  onChange={() => toggle(d.id)}
                  className="absolute left-2 top-2 h-4 w-4 accent-ink"
                />
                <div className="absolute right-2 top-2">
                  <StatusBadge status={d.status} />
                </div>
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-ink">{d.name}</p>
                <p className="truncate text-xs text-ink/50">
                  {d.restaurantName}
                  {d.price != null ? ` · ${d.price}` : ""}
                </p>
                <div className="mt-2 flex gap-3 text-xs">
                  <Link
                    href={`/admin/dishes/${d.id}`}
                    className="font-medium text-ink/70 hover:underline"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => removeOne(d)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink/40"
    >
      {children}
    </select>
  );
}

function ViewBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium ${
        active ? "bg-ink text-white" : "bg-white text-ink/60 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: "published" | "draft" }) {
  return status === "published" ? (
    <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-semibold text-green-700">
      Published
    </span>
  ) : (
    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
      Draft
    </span>
  );
}

function Thumb({ src }: { src: string | null }) {
  return (
    <span className="block h-9 w-9 shrink-0 overflow-hidden rounded-md bg-black/5">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      )}
    </span>
  );
}
