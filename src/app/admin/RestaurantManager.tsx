"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Restaurant } from "@/lib/types";

export default function RestaurantManager({
  initial,
}: {
  initial: Restaurant[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, area }),
    });
    setBusy(false);
    if (res.ok) {
      setName("");
      setArea("");
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error ?? "Failed to add restaurant.");
    }
  }

  async function saveEdit(r: Restaurant, next: { name: string; area: string }) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/restaurants/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setBusy(false);
    if (res.ok) {
      setEditing(null);
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error ?? "Failed to update restaurant.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Restaurant name"
          className="flex-1 rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
        />
        <input
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="Area (optional)"
          className="flex-1 rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
        />
        <button
          onClick={add}
          disabled={busy || !name.trim()}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Add
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <ul className="divide-y divide-black/5 dark:divide-white/10">
        {initial.map((r) =>
          editing === r.id ? (
            <EditRow
              key={r.id}
              restaurant={r}
              busy={busy}
              onCancel={() => setEditing(null)}
              onSave={(next) => saveEdit(r, next)}
            />
          ) : (
            <li key={r.id} className="flex items-center gap-3 py-3 text-sm">
              <span className="flex-1">
                {r.name}
                {r.area && (
                  <span className="text-black/40 dark:text-white/40">
                    {" "}
                    · {r.area}
                  </span>
                )}
              </span>
              <button
                onClick={() => setEditing(r.id)}
                className="underline underline-offset-4"
              >
                Edit
              </button>
            </li>
          )
        )}
        {initial.length === 0 && (
          <li className="py-4 text-sm text-black/40 dark:text-white/40">
            No restaurants yet.
          </li>
        )}
      </ul>
    </div>
  );
}

function EditRow({
  restaurant,
  busy,
  onCancel,
  onSave,
}: {
  restaurant: Restaurant;
  busy: boolean;
  onCancel: () => void;
  onSave: (next: { name: string; area: string }) => void;
}) {
  const [name, setName] = useState(restaurant.name);
  const [area, setArea] = useState(restaurant.area ?? "");
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
      />
      <input
        value={area}
        onChange={(e) => setArea(e.target.value)}
        placeholder="Area"
        className="flex-1 rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ name, area })}
          disabled={busy || !name.trim()}
          className="rounded-lg bg-black px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Save
        </button>
        <button onClick={onCancel} className="px-3 py-2 text-sm">
          Cancel
        </button>
      </div>
    </li>
  );
}
