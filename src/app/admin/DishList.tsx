"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface DishRow {
  id: string;
  name: string;
  price: number | null;
  cuisine: string | null;
  image_url: string | null;
  status: "draft" | "published";
  restaurantName: string;
}

type StatusFilter = "all" | "published" | "draft";

export default function DishList({ dishes }: { dishes: DishRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dishes.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.restaurantName.toLowerCase().includes(q) ||
        (d.cuisine ?? "").toLowerCase().includes(q)
      );
    });
  }, [dishes, query, statusFilter]);

  async function remove(d: DishRow) {
    if (!confirm(`Delete "${d.name}"? This can't be undone.`)) return;
    setBusyId(d.id);
    const res = await fetch(`/api/admin/dishes/${d.id}`, { method: "DELETE" });
    setBusyId(null);
    if (res.ok) {
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      alert(error ?? "Delete failed.");
    }
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by dish, restaurant, or cuisine…"
        className="mb-3 w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
      />

      <div className="mb-4 flex gap-2">
        {(["all", "published", "draft"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
              statusFilter === s
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/15 dark:border-white/20"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-black/40 dark:text-white/40">
          No dishes match.
        </p>
      ) : (
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {filtered.map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={d.image_url ?? ""}
                alt=""
                className="h-12 w-12 shrink-0 rounded-lg bg-black/5 object-cover dark:bg-white/10"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium">
                  {d.name}
                  {d.status === "draft" && (
                    <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                      Draft
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-black/50 dark:text-white/50">
                  {d.restaurantName}
                  {d.cuisine ? ` · ${d.cuisine}` : ""}
                  {d.price != null ? ` · ${d.price}` : ""}
                </p>
              </div>
              <Link
                href={`/admin/dishes/${d.id}`}
                className="rounded-md px-3 py-1.5 text-sm underline underline-offset-4"
              >
                Edit
              </Link>
              <button
                onClick={() => remove(d)}
                disabled={busyId === d.id}
                className="rounded-md px-2 py-1.5 text-sm text-red-600 disabled:opacity-50 dark:text-red-400"
              >
                {busyId === d.id ? "…" : "Delete"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
