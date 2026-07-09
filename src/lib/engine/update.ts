import {
  ATTRIBUTE_KEYS,
  type DishAttributes,
  type TasteWeights,
} from "@/lib/types";
import { score, meanWeights } from "./scoring";

export const LEARNING_RATE = 0.1;
export const VAR_DECAY = 0.97;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Bradley–Terry online update after a duel where `winner` beat `loser`.
 * Uses current means to form the prediction, nudges each weight toward the
 * winner's attributes proportional to the surprise, and shrinks variance.
 *
 *   p   = sigmoid(score_W - score_L)   // using current means
 *   err = 1 - p                        // winner's target is 1
 *   mean[k] += LR * (attr_W[k] - attr_L[k]) * err
 *   var[k]  *= 0.97
 */
export function bradleyTerryUpdate(
  weights: TasteWeights,
  winnerAttrs: DishAttributes,
  loserAttrs: DishAttributes
): TasteWeights {
  const means = meanWeights(weights);
  const p = sigmoid(score(winnerAttrs, means) - score(loserAttrs, means));
  const err = 1 - p;

  const next = {} as TasteWeights;
  for (const k of ATTRIBUTE_KEYS) {
    const w = weights[k] ?? { mean: 0, var: 1 };
    next[k] = {
      mean: w.mean + LEARNING_RATE * (winnerAttrs[k] - loserAttrs[k]) * err,
      var: w.var * VAR_DECAY,
    };
  }
  return next;
}
