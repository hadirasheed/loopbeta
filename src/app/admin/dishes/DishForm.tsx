"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ATTRIBUTE_KEYS,
  type AttributeKey,
  type DishAttributes,
  type DeliveryApp,
  type Restaurant,
  ALLERGEN_OPTIONS,
} from "@/lib/types";

export interface DishFormValues {
  id?: string;
  restaurant_id: string;
  name: string;
  image_url: string;
  price: string;
  description: string;
  attributes: DishAttributes;
  cuisine: string;
  main_protein: string;
  prep_style: string;
  is_veg: boolean;
  is_halal: boolean;
  allergens: string[];
  delivery_apps: DeliveryApp[];
}

const ATTR_LABELS: Record<AttributeKey, string> = {
  heaviness: "Heaviness",
  spiciness: "Spiciness",
  price_tier: "Price tier",
  healthiness: "Healthiness",
  adventurousness: "Adventurousness",
  warmth: "Warmth",
};

export function emptyValues(): DishFormValues {
  return {
    restaurant_id: "",
    name: "",
    image_url: "",
    price: "",
    description: "",
    attributes: Object.fromEntries(
      ATTRIBUTE_KEYS.map((k) => [k, 0.5])
    ) as DishAttributes,
    cuisine: "",
    main_protein: "",
    prep_style: "",
    is_veg: false,
    is_halal: true,
    allergens: [],
    delivery_apps: [],
  };
}

export default function DishForm({
  restaurants,
  initial,
}: {
  restaurants: Restaurant[];
  initial: DishFormValues;
}) {
  const router = useRouter();
  const [v, setV] = useState<DishFormValues>(initial);
  const [restaurantList, setRestaurantList] = useState(restaurants);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRestaurant, setNewRestaurant] = useState(false);
  const [newRName, setNewRName] = useState("");
  const [newRArea, setNewRArea] = useState("");

  const isEdit = Boolean(v.id);

  function set<K extends keyof DishFormValues>(k: K, val: DishFormValues[K]) {
    setV((prev) => ({ ...prev, [k]: val }));
  }

  function setAttr(k: AttributeKey, val: number) {
    setV((prev) => ({
      ...prev,
      attributes: { ...prev.attributes, [k]: val },
    }));
  }

  function toggleAllergen(a: string) {
    setV((prev) => ({
      ...prev,
      allergens: prev.allergens.includes(a)
        ? prev.allergens.filter((x) => x !== a)
        : [...prev.allergens, a],
    }));
  }

  async function createRestaurant() {
    if (!newRName.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newRName, area: newRArea }),
    });
    setBusy(false);
    if (res.ok) {
      const r = (await res.json()) as Restaurant;
      setRestaurantList((prev) =>
        [...prev, r].sort((a, b) => a.name.localeCompare(b.name))
      );
      set("restaurant_id", r.id);
      setNewRestaurant(false);
      setNewRName("");
      setNewRArea("");
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error ?? "Failed to create restaurant.");
    }
  }

  function updateApp(i: number, patch: Partial<DeliveryApp>) {
    setV((prev) => {
      const apps = [...prev.delivery_apps];
      apps[i] = { ...apps[i], ...patch };
      return { ...prev, delivery_apps: apps };
    });
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const payload = {
      restaurant_id: v.restaurant_id,
      name: v.name,
      image_url: v.image_url,
      price: v.price === "" ? null : Number(v.price),
      description: v.description,
      attributes: v.attributes,
      cuisine: v.cuisine,
      main_protein: v.main_protein,
      prep_style: v.prep_style,
      is_veg: v.is_veg,
      is_halal: v.is_halal,
      allergens: v.allergens,
      delivery_apps: v.delivery_apps.filter((a) => a.app && a.url),
    };
    const res = await fetch(
      isEdit ? `/api/admin/dishes/${v.id}` : "/api/admin/dishes",
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setBusy(false);
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error ?? "Failed to save dish.");
    }
  }

  const inputCls =
    "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/20 dark:focus:border-white";

  return (
    <div className="flex flex-col gap-6">
      <Field label="Dish name">
        <input
          className={inputCls}
          value={v.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Chicken Biryani"
        />
      </Field>

      <Field label="Restaurant">
        {!newRestaurant ? (
          <div className="flex gap-2">
            <select
              className={inputCls}
              value={v.restaurant_id}
              onChange={(e) => set("restaurant_id", e.target.value)}
            >
              <option value="">Select a restaurant…</option>
              {restaurantList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.area ? ` (${r.area})` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
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
              value={newRName}
              onChange={(e) => setNewRName(e.target.value)}
              placeholder="New restaurant name"
            />
            <input
              className={inputCls}
              value={newRArea}
              onChange={(e) => setNewRArea(e.target.value)}
              placeholder="Area (optional)"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={createRestaurant}
                disabled={busy || !newRName.trim()}
                className="rounded-lg bg-black px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setNewRestaurant(false)}
                className="px-3 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Field>

      <Field label="Image URL">
        <input
          className={inputCls}
          value={v.image_url}
          onChange={(e) => set("image_url", e.target.value)}
          placeholder="https://…"
        />
        {v.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={v.image_url}
            alt=""
            className="mt-2 h-28 w-full rounded-lg object-cover"
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Price">
          <input
            className={inputCls}
            type="number"
            min="0"
            step="0.5"
            value={v.price}
            onChange={(e) => set("price", e.target.value)}
            placeholder="38"
          />
        </Field>
        <Field label="Cuisine">
          <input
            className={inputCls}
            value={v.cuisine}
            onChange={(e) => set("cuisine", e.target.value)}
            placeholder="indian"
          />
        </Field>
      </div>

      <Field label="One-line description">
        <input
          className={inputCls}
          value={v.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Fragrant basmati layered with spiced chicken."
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Main protein">
          <input
            className={inputCls}
            value={v.main_protein}
            onChange={(e) => set("main_protein", e.target.value)}
            placeholder="chicken"
          />
        </Field>
        <Field label="Prep style">
          <input
            className={inputCls}
            value={v.prep_style}
            onChange={(e) => set("prep_style", e.target.value)}
            placeholder="steamed"
          />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">
          Taste attributes (0–1)
        </legend>
        {ATTRIBUTE_KEYS.map((k) => (
          <label key={k} className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0">{ATTR_LABELS[k]}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={v.attributes[k]}
              onChange={(e) => setAttr(k, Number(e.target.value))}
              className="flex-1 accent-black dark:accent-white"
            />
            <span className="w-10 text-right tabular-nums text-black/50 dark:text-white/50">
              {v.attributes[k].toFixed(2)}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={v.is_veg}
            onChange={(e) => set("is_veg", e.target.checked)}
            className="h-4 w-4 accent-black dark:accent-white"
          />
          Vegetarian
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={v.is_halal}
            onChange={(e) => set("is_halal", e.target.checked)}
            className="h-4 w-4 accent-black dark:accent-white"
          />
          Halal
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Contains allergens</legend>
        <div className="flex flex-wrap gap-2">
          {ALLERGEN_OPTIONS.map((a) => (
            <button
              type="button"
              key={a}
              onClick={() => toggleAllergen(a)}
              className={`rounded-full border px-3 py-1.5 text-sm capitalize transition ${
                v.allergens.includes(a)
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-black/15 dark:border-white/20"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Delivery apps</legend>
        {v.delivery_apps.map((app, i) => (
          <div key={i} className="flex gap-2">
            <input
              className={inputCls}
              value={app.app}
              onChange={(e) => updateApp(i, { app: e.target.value })}
              placeholder="talabat"
            />
            <input
              className={inputCls}
              value={app.url}
              onChange={(e) => updateApp(i, { url: e.target.value })}
              placeholder="https://…"
            />
            <button
              type="button"
              onClick={() =>
                set(
                  "delivery_apps",
                  v.delivery_apps.filter((_, j) => j !== i)
                )
              }
              className="shrink-0 px-2 text-sm text-red-600 dark:text-red-400"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            set("delivery_apps", [...v.delivery_apps, { app: "", url: "" }])
          }
          className="self-start rounded-lg border border-black/15 px-3 py-1.5 text-sm dark:border-white/20"
        >
          + Add delivery app
        </button>
      </fieldset>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 flex gap-3 border-t border-black/10 bg-background py-4 dark:border-white/10">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !v.name.trim() || !v.restaurant_id}
          className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {busy ? "Saving…" : isEdit ? "Save changes" : "Create dish"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="rounded-full border border-black/15 px-6 py-3 text-sm dark:border-white/20"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
