import {
  ATTRIBUTE_KEYS,
  type AttributeKey,
  type Dish,
  type TasteWeights,
} from "@/lib/types";
import { score, sampleWeights, meanWeights } from "./scoring";
import { effectiveWeights, makePrng, type DuelContext } from "./context";

export const NUM_PROBES = 3;
export const WINS_TO_COMMIT = 3;
export const MAX_NEITHER = 4;
export const HARD_CAP_ROUNDS = 12;

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
  rejected: Set<string>; // dishes in a "neither" duel — the user wants neither
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Reconstruct the live session state from the append-only duel log. */
export function deriveState(duels: DuelRecord[]): SessionState {
  const roundIndex = duels.length;
  const winCounts = new Map<string, number>();
  const shownPairs = new Set<string>();
  const rejected = new Set<string>();

  let lastNeitherRound = -1;
  duels.forEach((d, i) => {
    shownPairs.add(pairKey(d.dish_a, d.dish_b));
    if (d.winner === "neither") {
      lastNeitherRound = i;
      // "Neither" means the user wants neither dish — retire both for this
      // session so they don't keep coming back.
      rejected.add(d.dish_a);
      rejected.add(d.dish_b);
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
    rejected,
  };
}

/**
 * Dishes still worth showing this session: everything the user hasn't sent
 * away with a "neither". Falls back to the full pool if that empties it, so
 * the session can always finish.
 */
export function sessionPool(eligible: Dish[], state: SessionState): Dish[] {
  const pool = eligible.filter((d) => !state.rejected.has(d.id));
  return pool.length > 0 ? pool : eligible;
}

export type NextStep =
  | { done: false; aId: string; bId: string; roundIndex: number }
  | { done: true; heroId: string; backupId: string | null };

/**
 * Pick a probe pair: far apart on `dim`, close on every other attribute. On top
 * of that it (a) leans toward the region the user's context prefers — via the
 * mood/daypart-shifted mean weights — and (b) adds seeded jitter so different
 * sessions open with different (still-valid) pairs instead of the same two
 * dishes every time.
 */
function pickProbePair(
  eligible: Dish[],
  dim: AttributeKey,
  shownPairs: Set<string>,
  weights: TasteWeights,
  rand: () => number
): [Dish, Dish] | null {
  const means = meanWeights(weights);
  const candidates: { pair: [Dish, Dish]; s: number }[] = [];
  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const a = eligible[i];
      const b = eligible[j];
      if (shownPairs.has(pairKey(a.id, b.id))) continue; // never repeat
      const spread = Math.abs(a.attributes[dim] - b.attributes[dim]);
      let otherDist = 0;
      let affinity = 0;
      for (const k of ATTRIBUTE_KEYS) {
        if (k === dim) continue;
        otherDist += Math.abs(a.attributes[k] - b.attributes[k]);
        // How well the pair's shared region matches what the user wants now.
        affinity += means[k] * ((a.attributes[k] + b.attributes[k]) / 2 - 0.5);
      }
      // Wide gap on `dim`, close elsewhere, leaning into the context region.
      candidates.push({ pair: [a, b], s: 2 * spread - otherDist + 1.5 * affinity });
    }
  }
  if (candidates.length === 0) return null;

  // Instead of always taking the single best pair (which would open every
  // session with the same two dishes), sample among the strongest handful,
  // rank-weighted so quality stays high but the opener varies per session.
  candidates.sort((x, y) => y.s - x.s);
  const topK = Math.min(8, candidates.length);
  let totalWeight = 0;
  for (let r = 0; r < topK; r++) totalWeight += topK - r; // topK, …, 1
  let pick = rand() * totalWeight;
  for (let r = 0; r < topK; r++) {
    pick -= topK - r;
    if (pick <= 0) return candidates[r].pair;
  }
  return candidates[0].pair;
}

/** King-of-the-hill challenger: top sampled-scoring dish the champion hasn't met. */
function pickChallenger(
  eligible: Dish[],
  championId: string,
  beaten: Set<string>,
  shownPairs: Set<string>,
  weights: TasteWeights
): Dish | null {
  const sampled = sampleWeights(weights);
  const ranked = eligible
    .filter((d) => d.id !== championId)
    .map((d) => ({ d, s: score(d.attributes, sampled) }))
    .sort((x, y) => y.s - x.s);

  // Best: a matchup the user hasn't seen at all this session.
  const unseen = ranked.find(
    (r) => !beaten.has(r.d.id) && !shownPairs.has(pairKey(championId, r.d.id))
  );
  if (unseen) return unseen.d;
  // Next: at least someone the current champion hasn't already beaten.
  const fresh = ranked.find((r) => !beaten.has(r.d.id));
  if (fresh) return fresh.d;
  // Everyone eligible has already lost to the champion; nothing new to show.
  return ranked[0]?.d ?? null;
}

/**
 * Best dish so far: most wins, tie-broken by mean-weight score. Dishes the
 * user "neither"-ed are only considered if nothing else is left.
 */
export function bestSoFar(
  eligible: Dish[],
  state: SessionState,
  weights: TasteWeights
): Dish | null {
  const pool = sessionPool(eligible, state);
  if (pool.length === 0) return null;
  const means = meanWeights(weights);
  return [...pool].sort((a, b) => {
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
  weights: TasteWeights,
  context?: DuelContext
): NextStep {
  // Terminal checks first.
  const commitId = commitDecision(eligible, state, weights);
  if (commitId) {
    return {
      done: true,
      heroId: commitId,
      backupId: pickBackup(
        sessionPool(eligible, state),
        commitId,
        weights
      ),
    };
  }

  // Bias selection by mood + time of day; keep learning (weights) untouched.
  const eff = context ? effectiveWeights(weights, context) : weights;
  // Seeded per session + round: stable if the client re-fetches the same
  // round, but different every new session so the opening pair varies.
  const rand = context
    ? makePrng(`${context.seed}:${state.roundIndex}`)
    : Math.random;

  // Everything below draws from the pool minus "neither"-ed dishes.
  const pool = sessionPool(eligible, state);

  const probing = state.roundsSinceReset < NUM_PROBES || state.champion === null;

  if (probing) {
    const dim = PROBE_DIMS[Math.min(state.roundsSinceReset, PROBE_DIMS.length - 1)];
    const pair = pickProbePair(pool, dim, state.shownPairs, eff, rand);
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
      pool,
      state.champion,
      state.beatenByChampion,
      state.shownPairs,
      eff
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
  const sampled = sampleWeights(eff);
  const ranked = [...pool].sort(
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
  // The user has "neither"-ed their way through the catalog: fewer than two
  // non-rejected dishes remain, so there's no fresh duel left to offer.
  const remaining = eligible.filter((d) => !state.rejected.has(d.id));
  if (remaining.length < 2) {
    return (
      remaining[0]?.id ?? bestSoFar(eligible, state, weights)?.id ?? null
    );
  }
  return null;
}
