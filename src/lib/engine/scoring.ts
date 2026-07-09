import {
  ATTRIBUTE_KEYS,
  type DishAttributes,
  type TasteWeights,
} from "@/lib/types";

/** score(dish) = Σ attributes[k] * weights[k] over the 6 numeric attributes. */
export function score(
  attributes: DishAttributes,
  weights: Record<string, number>
): number {
  let s = 0;
  for (const k of ATTRIBUTE_KEYS) {
    s += (attributes[k] ?? 0) * (weights[k] ?? 0);
  }
  return s;
}

/** Standard normal via Box–Muller. */
function randNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Thompson sampling: draw w[k] ~ Normal(mean[k], var[k]) for each attribute.
 * Scoring with the sampled weights gives built-in exploration — cold-start
 * rows (mean 0, var 1) explore maximally.
 */
export function sampleWeights(weights: TasteWeights): Record<string, number> {
  const sampled: Record<string, number> = {};
  for (const k of ATTRIBUTE_KEYS) {
    const w = weights[k] ?? { mean: 0, var: 1 };
    const sd = Math.sqrt(Math.max(0, w.var));
    sampled[k] = w.mean + sd * randNormal();
  }
  return sampled;
}

/** Mean weights (no sampling) — used for deterministic ranking, e.g. backup. */
export function meanWeights(weights: TasteWeights): Record<string, number> {
  const m: Record<string, number> = {};
  for (const k of ATTRIBUTE_KEYS) {
    m[k] = weights[k]?.mean ?? 0;
  }
  return m;
}
