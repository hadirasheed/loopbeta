import { ATTRIBUTE_KEYS, type DeliveryApp, type DishAttributes } from "@/lib/types";

export interface DishInput {
  restaurant_id: string;
  name: string;
  image_url: string | null;
  price: number | null;
  description: string | null;
  attributes: DishAttributes;
  cuisine: string | null;
  main_protein: string | null;
  prep_style: string | null;
  is_veg: boolean;
  is_halal: boolean;
  allergens: string[];
  delivery_apps: DeliveryApp[];
}

function clamp01(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

/**
 * Validates and normalizes an admin dish payload. Returns either the clean
 * row to persist or a human-readable error. Attribute keys are pinned to
 * ATTRIBUTE_KEYS so the model always sees a complete vector.
 */
export function parseDishInput(
  body: unknown
): { ok: true; value: DishInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Expected a JSON object." };
  }
  const b = body as Record<string, unknown>;

  const restaurant_id = str(b.restaurant_id);
  if (!restaurant_id) return { ok: false, error: "Restaurant is required." };

  const name = str(b.name);
  if (!name) return { ok: false, error: "Dish name is required." };

  const rawAttrs =
    typeof b.attributes === "object" && b.attributes !== null
      ? (b.attributes as Record<string, unknown>)
      : {};
  const attributes = Object.fromEntries(
    ATTRIBUTE_KEYS.map((k) => [k, clamp01(rawAttrs[k])])
  ) as DishAttributes;

  let price: number | null = null;
  if (b.price !== null && b.price !== undefined && b.price !== "") {
    const p = Number(b.price);
    if (!Number.isFinite(p) || p < 0) {
      return { ok: false, error: "Price must be a non-negative number." };
    }
    price = p;
  }

  const allergens = Array.isArray(b.allergens)
    ? b.allergens.filter((a): a is string => typeof a === "string")
    : [];

  const delivery_apps: DeliveryApp[] = Array.isArray(b.delivery_apps)
    ? b.delivery_apps
        .map((d) => {
          const o = d as Record<string, unknown>;
          const app = str(o?.app);
          const url = str(o?.url);
          return app && url ? { app, url } : null;
        })
        .filter((d): d is DeliveryApp => d !== null)
    : [];

  return {
    ok: true,
    value: {
      restaurant_id,
      name,
      image_url: str(b.image_url),
      price,
      description: str(b.description),
      attributes,
      cuisine: str(b.cuisine),
      main_protein: str(b.main_protein),
      prep_style: str(b.prep_style),
      is_veg: b.is_veg === true,
      is_halal: b.is_halal !== false,
      allergens,
      delivery_apps,
    },
  };
}
