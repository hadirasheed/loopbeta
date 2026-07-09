// Shared domain types. Keep in sync with supabase/migrations.

export const ATTRIBUTE_KEYS = [
  "heaviness",
  "spiciness",
  "price_tier",
  "healthiness",
  "adventurousness",
  "warmth",
] as const;

export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

/** Allergens offered in onboarding and tagged on dishes. Client-safe. */
export const ALLERGEN_OPTIONS = [
  "dairy",
  "gluten",
  "egg",
  "peanut",
  "nuts",
  "soy",
  "shellfish",
  "fish",
  "sesame",
] as const;

/** Each attribute normalized 0..1. */
export type DishAttributes = Record<AttributeKey, number>;

/** Per-attribute Gaussian belief over the user's preference weight. */
export type TasteWeights = Record<AttributeKey, { mean: number; var: number }>;

export interface DeliveryApp {
  app: string;
  url: string;
}

export interface Restaurant {
  id: string;
  name: string;
  area: string | null;
}

export interface Dish {
  id: string;
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

export interface UserConstraints {
  user_id: string;
  is_veg: boolean;
  is_halal: boolean;
  allergens: string[];
}

export type Mood = "starving" | "peckish" | "browsing";

export type DuelWinner = "a" | "b" | "neither";

/** Fresh user_taste row: mean 0, var 1 on every attribute (max exploration). */
export function coldStartWeights(): TasteWeights {
  return Object.fromEntries(
    ATTRIBUTE_KEYS.map((k) => [k, { mean: 0, var: 1 }])
  ) as TasteWeights;
}
