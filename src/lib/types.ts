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

/**
 * What each 0..1 attribute weight means. Shared by the dish form reference
 * table, the review screen, and the AI tagging prompt.
 */
export const ATTRIBUTE_GUIDE: Record<
  AttributeKey,
  { label: string; low: string; high: string }
> = {
  heaviness: { label: "Heaviness", low: "light / refreshing", high: "heavy / rich / filling" },
  spiciness: { label: "Spiciness", low: "not spicy", high: "very spicy / hot" },
  price_tier: { label: "Price tier", low: "cheap", high: "premium / expensive" },
  healthiness: { label: "Healthiness", low: "indulgent", high: "healthy / nutritious" },
  adventurousness: { label: "Adventurousness", low: "familiar / safe", high: "adventurous / unusual" },
  warmth: { label: "Warmth", low: "cold dish", high: "hot / comforting" },
};

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

export type DishStatus = "draft" | "published";

/** Dayparts a dish is available for; empty array means "no restriction". */
export const DAYPARTS = ["morning", "afternoon", "evening", "night"] as const;
export type Daypart = (typeof DAYPARTS)[number];

/** Seasons a dish is offered in; empty array means "no restriction". */
export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];

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
  tags: string[];
  available_dayparts: string[];
  seasons: string[];
  status: DishStatus;
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
