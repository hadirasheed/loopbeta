import {
  ATTRIBUTE_KEYS,
  type AttributeKey,
  type Dish,
  type TasteWeights,
} from "@/lib/types";
import { score, sampleWeights, meanWeights } from "./scoring";

export const NUM_PROBES = 3;
export const WINS_TO_COMMIT = 3;
export const MAX_NEITHER = 2;
export const HARD_CAP_ROUNDS = 10;

// Appetite probes, in order: their pick sets each dimension fast.
const PROBE_DIMS: AttributeKey[] = ["heaviness", "spiciness", "adventurousness"];

export interface DuelRecord {
  dish_a: string;
  dish_b: string;
  winner: "a" | "b" | "neither";
  round_index: number;
}

export interface SessionState {
  roundIndex: number; // index of the next round = number of duels so far
  champion: string | null; // dish id currently holding the hill
  streak: number; // consecutive wins by champion from the end
  neitherCount: number;
  roundsSinceReset: number; // rounds since the last "neither"
  beatenByChampion: Set<string>; // dishes the champion has defeated
  winCounts: Map<string, number>; // wins per dish across the session
  shownPairs: Set<string>; // "a|b" (sorted) pairs already presented
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Reconstruct the live session state from the append-only duel log. */
export function deriveState(duels: DuelRecord[]): SessionState {
  const roundIndex = duels.length;
  const winCounts = new Map<string, number>();
  const shownPairs = new Set<string>();

  let lastNeitherRound = -1;
  duels.forEach((d, i) => {
    shownPairs.add(pairKey(d.dish_a, d.dish_b));
    if (d.winner === "neither") {
      lastNeitherRound = i;
    } else {
      const w = d.winner === "a" ? d.dish_a : d.dish_b;
      winCounts.set(w, (winCounts.get(w) ?? 0) + 1);
    }
  });

  const neitherCount = duels.filter((d) => d.winner === "neither").length;
  const roundsSinceReset = roundIndex - (lastNeitherRound + 1);

  // Champion + streak: walk backward from the most recent duel.
  let champion: string | null = null;
  let streak = 0;
  const beatenByChampion = new Set<string>();
  const last = duels[duels.length - 1];
  if (last && last.winner !== "neither") {
    champion = last.winner === "a" ? last.dish_a : last.dish_b;
    for (let i = duels.length - 1; i >= 0; i--) {
      const d = duels[i];
      if (d.winner === "neither") break;
      const w = d.winner === "a" ? d.dish_a : d.dish_b;
      const l = d.winner === "a" ? d.dish_b : d.dish_a;
      if (w !== champion) break;
      streak++;
      beatenByChampion.add(l);
    }
  }

  return {
    roundIndex,
    champion,
    streak,
    neitherCount,
    roundsSinceReset,
    beatenByChampion,
    winCounts,
    shownPairs,
  };
}

export type NextStep =
  | { done: false; aId: string; bId: string; roundIndex: number }
  | { done: true; heroId: string; backupId: string | null };

/** Pick a probe pair: close on every attribute except `dim`, far apart there. */
function pickProbePair(
  eligible: Dish[],
  dim: AttributeKey,
  shownPairs: Set<string>
): [Dish, Dish] | null {
  let best: [Dish, Dish] | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const a = eligible[i];
      const b = eligible[j];
      const spread = Math.abs(a.attributes[dim] - b.attributes[dim]);
      let otherDist = 0;
      for (const k of ATTRIBUTE_KEYS) {
        if (k === dim) continue;
        otherDist += Math.abs(a.attributes[k] - b.attributes[k]);
      }
      // Reward a wide gap on `dim`, penalize differences elsewhere.
      let s = 2 * spread - otherDist;
      if (shownPairs.has(pairKey(a.id, b.id))) s -= 100; // avoid repeats
      if (s > bestScore) {
        bestScore = s;
        best = [a, b];
      }
    }
  }
  return best;
}

/** King-of-the-hill challenger: top sampled-scoring dish the champion hasn't met. */
function pickChallenger(
  eligible: Dish[],
  championId: string,
  beaten: Set<string>,
  weights: TasteWeights
): Dish | null {
  const sampled = sampleWeights(weights);
  const ranked = eligible
    .filter((d) => d.id !== championId)
    .map((d) => ({ d, s: score(d.attributes, sampled) }))
    .sort((x, y) => y.s - x.s);

  const fresh = ranked.find((r) => !beaten.has(r.d.id));
  if (fresh) return fresh.d;
  // Everyone eligible has already lost to the champion; nothing new to show.
  return ranked[0]?.d ?? null;
}

/** Best dish so far: most wins, tie-broken by mean-weight score. */
export function bestSoFar(
  eligible: Dish[],
  state: SessionState,
  weights: TasteWeights
): Dish | null {
  if (eligible.length === 0) return null;
  const means = meanWeights(weights);
  return [...eligible].sort((a, b) => {
    const wa = state.winCounts.get(a.id) ?? 0;
    const wb = state.winCounts.get(b.id) ?? 0;
    if (wb !== wa) return wb - wa;
    return score(b.attributes, means) - score(a.attributes, means);
  })[0];
}

/** Highest mean-score eligible dish other than `excludeId` (the result backup). */
export function pickBackup(
  eligible: Dish[],
  excludeId: string,
  weights: TasteWeights
): string | null {
  const means = meanWeights(weights);
  const ranked = eligible
    .filter((d) => d.id !== excludeId)
    .map((d) => ({ id: d.id, s: score(d.attributes, means) }))
    .sort((x, y) => y.s - x.s);
  return ranked[0]?.id ?? null;
}

/**
 * Decide the next duel, or that the session should commit. Pure: all data is
 * passed in. Probe for the first few rounds (and after a "neither"), then
 * king-of-the-hill until a champion three-peats or we hit the caps.
 */
export function nextStep(
  eligible: Dish[],
  state: SessionState,
  weights: TasteWeights
): NextStep {
  // Terminal checks first.
  const commitId = commitDecision(eligible, state, weights);
  if (commitId) {
    return {
      done: true,
      heroId: commitId,
      backupId: pickBackup(eligible, commitId, weights),
    };
  }

  const probing = state.roundsSinceReset < NUM_PROBES || state.champion === null;

  if (probing) {
    const dim = PROBE_DIMS[Math.min(state.roundsSinceReset, PROBE_DIMS.length - 1)];
    const pair = pickProbePair(eligible, dim, state.shownPairs);
    if (pair) {
      return {
        done: false,
        aId: pair[0].id,
        bId: pair[1].id,
        roundIndex: state.roundIndex,
      };
    }
  }

  // King-of-the-hill.
  if (state.champion) {
    const challenger = pickChallenger(
      eligible,
      state.champion,
      state.beatenByChampion,
      weights
    );
    if (challenger) {
      return {
        done: false,
        aId: state.champion,
        bId: challenger.id,
        roundIndex: state.roundIndex,
      };
    }
  }

  // Fallback: no champion and no probe pair (tiny catalog) — pick top two.
  const sampled = sampleWeights(weights);
  const ranked = [...eligible].sort(
    (a, b) => score(b.attributes, sampled) - score(a.attributes, sampled)
  );
  if (ranked.length >= 2) {
    return {
      done: false,
      aId: ranked[0].id,
      bId: ranked[1].id,
      roundIndex: state.roundIndex,
    };
  }

  // Not enough to duel — commit whatever we have.
  const hero = bestSoFar(eligible, state, weights);
  return {
    done: true,
    heroId: hero?.id ?? "",
    backupId: null,
  };
}

/**
 * Returns the dish id to commit to, or null to keep dueling. Called after a
 * duel is recorded (state already reflects it).
 */
export function commitDecision(
  eligible: Dish[],
  state: SessionState,
  weights: TasteWeights
): string | null {
  if (eligible.length === 0) return null;

  // Champion three-peated → that's the decision.
  if (state.champion && state.streak >= WINS_TO_COMMIT) {
    return state.champion;
  }
  // Too many "neither"s, or hit the hard round cap → commit best-so-far.
  if (
    state.neitherCount >= MAX_NEITHER ||
    state.roundIndex >= HARD_CAP_ROUNDS
  ) {
    return bestSoFar(eligible, state, weights)?.id ?? null;
  }
  // Only one eligible dish left overall → nothing to duel against.
  if (eligible.length === 1) {
    return eligible[0].id;
  }
  return null;
}
