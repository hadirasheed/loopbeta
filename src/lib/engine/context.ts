import {
  ATTRIBUTE_KEYS,
  type AttributeKey,
  type Daypart,
  type Mood,
  type TasteWeights,
} from "@/lib/types";

/**
 * Everything about "right now" that should shape which dishes surface, beyond
 * the user's long-term learned taste: their appetite this session, the time of
 * day, and a per-session seed so two sessions never open with the same pair.
 */
export interface DuelContext {
  mood: Mood | null;
  daypart: Daypart;
  seed: string;
}

/**
 * Appetite nudges to the learned mean weights (applied in-memory only, never
 * persisted). Starving → heavier, warmer, comforting; browsing → lighter and
 * more adventurous; peckish → no nudge.
 */
const MOOD_DELTAS: Record<Mood, Partial<Record<AttributeKey, number>>> = {
  starving: {
    heaviness: 0.45,
    warmth: 0.3,
    healthiness: -0.25,
    adventurousness: -0.2,
  },
  peckish: {},
  browsing: {
    heaviness: -0.3,
    adventurousness: 0.4,
    price_tier: -0.15,
    healthiness: 0.15,
  },
};

/**
 * Time-of-day nudges. Mornings lean light/healthy; evenings and nights lean
 * heavier and more comforting. Afternoons stay neutral.
 */
const DAYPART_DELTAS: Record<Daypart, Partial<Record<AttributeKey, number>>> = {
  morning: { heaviness: -0.35, spiciness: -0.3, healthiness: 0.35, warmth: 0.2 },
  afternoon: {},
  evening: { heaviness: 0.3, warmth: 0.3 },
  night: { heaviness: 0.35, warmth: 0.35, spiciness: 0.2 },
};

/**
 * Learned taste weights shifted by the current mood + daypart. Used only at
 * selection time to bias which dishes appear; the persisted learning is
 * untouched, so the model still converges to the user's true long-term taste.
 */
export function effectiveWeights(
  weights: TasteWeights,
  ctx: DuelContext
): TasteWeights {
  const md = ctx.mood ? MOOD_DELTAS[ctx.mood] : {};
  const dd = DAYPART_DELTAS[ctx.daypart];
  const out = {} as TasteWeights;
  for (const k of ATTRIBUTE_KEYS) {
    const w = weights[k] ?? { mean: 0, var: 1 };
    out[k] = { mean: w.mean + (md[k] ?? 0) + (dd[k] ?? 0), var: w.var };
  }
  return out;
}

/** Deterministic PRNG (mulberry32) seeded from a string — stable per session. */
export function makePrng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
