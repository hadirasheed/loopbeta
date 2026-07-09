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
  restaurantName: string;
}

export default function DishList({ dishes }: { dishes: DishRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dishes;
    return dishes.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.restaurantName.toLowerCase().includes(q) ||
        (d.cuisine ?? "").toLowerCase().includes(q)
    );
  }, [dishes, query]);

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
        className="mb-4 w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
      />

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
                <p className="truncate text-sm font-medium">{d.name}</p>
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
