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

/** A concrete, human-readable example anchored to a point on the 0..1 scale. */
export interface AttributeAnchor {
  value: number;
  example: string;
}

/**
 * What each 0..1 attribute weight means. Shared by the dish form reference
 * table, the review screen, and the AI tagging prompt. `scale` gives concrete
 * examples at fixed points (e.g. spiciness 0.5 = "spicy like a fresh chilli")
 * so the person entering weights knows what a number actually means.
 */
export const ATTRIBUTE_GUIDE: Record<
  AttributeKey,
  { label: string; low: string; high: string; scale: AttributeAnchor[] }
> = {
  heaviness: {
    label: "Heaviness",
    low: "light / refreshing",
    high: "heavy / rich / filling",
    scale: [
      { value: 0, example: "barely there — a fresh salad or fruit cup" },
      { value: 0.25, example: "light — a soup or small sandwich" },
      { value: 0.5, example: "medium — a rice bowl or pasta plate" },
      { value: 0.75, example: "filling — a loaded burger with fries" },
      { value: 1, example: "very heavy — a full biryani or mixed grill" },
    ],
  },
  spiciness: {
    label: "Spiciness",
    low: "not spicy",
    high: "very spicy / hot",
    scale: [
      { value: 0, example: "no heat at all — plain rice, hummus" },
      { value: 0.25, example: "mild — a faint pepper kick" },
      { value: 0.5, example: "medium — spicy like a fresh green chilli" },
      { value: 0.75, example: "hot — a proper spicy curry" },
      { value: 1, example: "fiery — extra chilli, ghost-pepper level" },
    ],
  },
  price_tier: {
    label: "Price tier",
    low: "cheap",
    high: "premium / expensive",
    scale: [
      { value: 0, example: "very cheap — street food" },
      { value: 0.25, example: "budget — casual takeaway" },
      { value: 0.5, example: "mid-range — a normal restaurant meal" },
      { value: 0.75, example: "pricey — upscale dining" },
      { value: 1, example: "premium — fine dining / a splurge" },
    ],
  },
  healthiness: {
    label: "Healthiness",
    low: "indulgent",
    high: "healthy / nutritious",
    scale: [
      { value: 0, example: "very indulgent — deep-fried, sugary" },
      { value: 0.25, example: "comfort food — tasty but heavy" },
      { value: 0.5, example: "balanced — a normal everyday meal" },
      { value: 0.75, example: "wholesome — lean and fresh" },
      { value: 1, example: "very healthy — salad-forward, clean eating" },
    ],
  },
  adventurousness: {
    label: "Adventurousness",
    low: "familiar / safe",
    high: "adventurous / unusual",
    scale: [
      { value: 0, example: "totally familiar — an everyday favourite" },
      { value: 0.25, example: "safe with a small twist" },
      { value: 0.5, example: "somewhat new — worth a try on a whim" },
      { value: 0.75, example: "unusual — most people haven't had it" },
      { value: 1, example: "daring — exotic or an acquired taste" },
    ],
  },
  warmth: {
    label: "Warmth",
    low: "cold dish",
    high: "hot / comforting",
    scale: [
      { value: 0, example: "served cold — ice cream, cold salad" },
      { value: 0.25, example: "cool — chilled or room temperature" },
      { value: 0.5, example: "warm — served just-warm" },
      { value: 0.75, example: "hot — a comforting hot plate" },
      { value: 1, example: "piping hot — soup, stew, off the grill" },
    ],
  },
};

/** The numeric anchor points every attribute scale shares (0, .25, .5, .75, 1). */
export const ATTRIBUTE_SCALE_POINTS = ATTRIBUTE_GUIDE.heaviness.scale.map(
  (a) => a.value
);

/** The example whose anchor is nearest to `value` — for live "0.5 means…" hints. */
export function attributeExample(key: AttributeKey, value: number): string {
  const scale = ATTRIBUTE_GUIDE[key].scale;
  let best = scale[0];
  let bestDist = Infinity;
  for (const anchor of scale) {
    const dist = Math.abs(anchor.value - value);
    if (dist < bestDist) {
      bestDist = dist;
      best = anchor;
    }
  }
  return best.example;
}

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
