import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dish, DeliveryApp } from "@/lib/types";
import { filterEligible } from "./constraints";
import { currentDaypart, filterByAvailability } from "./time-context";
import {
  bestSoFar,
  deriveState,
  nextStep,
  pickBackup,
  sessionPool,
  type NextStep,
  type SessionState,
} from "./session";
import type { Dish as DishType, TasteWeights, Mood } from "@/lib/types";
import type { DuelContext } from "./context";
import {
  loadConstraints,
  loadDishes,
  loadDuels,
  loadOrInitTaste,
} from "./db";

/** Card payload the duel/result screens render. */
export interface DishCard {
  id: string;
  name: string;
  restaurantName: string;
  price: number | null;
  description: string | null;
  image_url: string | null;
  cuisine: string | null;
  delivery_apps: DeliveryApp[];
}

export type StepPayload =
  | {
      done: false;
      sessionId: string;
      roundIndex: number;
      pair: { a: DishCard; b: DishCard };
    }
  | {
      done: true;
      sessionId: string;
      result: { hero: DishCard; backup: DishCard | null };
    };

function buildCard(dish: Dish, restaurantName: string): DishCard {
  return {
    id: dish.id,
    name: dish.name,
    restaurantName,
    price: dish.price,
    description: dish.description,
    image_url: dish.image_url,
    cuisine: dish.cuisine,
    delivery_apps: dish.delivery_apps,
  };
}

interface EngineContext {
  eligible: DishType[];
  weights: TasteWeights;
  state: SessionState;
  context: DuelContext;
  card: (id: string) => DishCard | null;
}

/** Load + assemble everything the engine needs for one request. */
async function loadContext(
  db: SupabaseClient,
  userId: string,
  sessionId: string
): Promise<EngineContext> {
  const [dishes, constraints, weights, duels, restaurantNames, mood] =
    await Promise.all([
      loadDishes(db),
      loadConstraints(db, userId),
      loadOrInitTaste(db, userId),
      loadDuels(db, sessionId),
      loadRestaurantNames(db),
      loadMood(db, sessionId),
    ]);

  // Duel pool = published (loadDishes) ∩ available now (daypart) ∩ within the
  // user's hard constraints.
  const daypart = currentDaypart(new Date());
  const available = filterByAvailability(dishes, daypart);
  const eligible = filterEligible(available, constraints);
  const dishById = new Map(dishes.map((d) => [d.id, d]));
  const state = deriveState(duels);

  // Time of day + appetite + a per-session seed shape which dishes surface.
  const context: DuelContext = { mood, daypart, seed: sessionId };

  const card = (id: string): DishCard | null => {
    const d = dishById.get(id);
    if (!d) return null;
    return buildCard(d, restaurantNames.get(d.restaurant_id) ?? "—");
  };

  return { eligible, weights, state, context, card };
}

async function loadMood(
  db: SupabaseClient,
  sessionId: string
): Promise<Mood | null> {
  const { data } = await db
    .from("sessions")
    .select("mood")
    .eq("id", sessionId)
    .maybeSingle();
  return (data?.mood as Mood | null) ?? null;
}

const FALLBACK_CARD = (id: string): DishCard => ({
  id,
  name: "Your pick",
  restaurantName: "—",
  price: null,
  description: null,
  image_url: null,
  cuisine: null,
  delivery_apps: [],
});

/**
 * Loads everything the engine needs, computes the next step, and — if the
 * session just reached a decision — persists committed_dish_id once. Shared
 * by /api/next-pair and /api/record-duel so both return the same shape.
 */
export async function computePayload(
  db: SupabaseClient,
  userId: string,
  sessionId: string
): Promise<StepPayload> {
  const { eligible, weights, state, context, card } = await loadContext(
    db,
    userId,
    sessionId
  );
  const step: NextStep = nextStep(eligible, state, weights, context);

  if (step.done) {
    const hero = card(step.heroId);
    const backup = step.backupId ? card(step.backupId) : null;
    // Persist the decision once.
    await db
      .from("sessions")
      .update({ committed_dish_id: step.heroId })
      .eq("id", sessionId)
      .is("committed_dish_id", null);
    return {
      done: true,
      sessionId,
      result: { hero: hero ?? FALLBACK_CARD(step.heroId), backup },
    };
  }

  const a = card(step.aId);
  const b = card(step.bId);
  if (!a || !b) {
    // Shouldn't happen, but never hand the client a half-pair.
    throw new Error("Failed to build duel pair");
  }
  return {
    done: false,
    sessionId,
    roundIndex: step.roundIndex,
    pair: { a, b },
  };
}

/**
 * Force an early decision ("Done"): commit to the best dish so far and return
 * the result payload, regardless of the normal stop conditions.
 */
export async function commitBestNow(
  db: SupabaseClient,
  userId: string,
  sessionId: string
): Promise<StepPayload> {
  const { eligible, weights, state, card } = await loadContext(
    db,
    userId,
    sessionId
  );
  const hero = bestSoFar(eligible, state, weights) ?? eligible[0] ?? null;
  const heroId = hero?.id ?? "";
  const backupId = heroId
    ? pickBackup(sessionPool(eligible, state), heroId, weights)
    : null;

  if (heroId) {
    await db
      .from("sessions")
      .update({ committed_dish_id: heroId })
      .eq("id", sessionId)
      .is("committed_dish_id", null);
  }

  return {
    done: true,
    sessionId,
    result: {
      hero: (heroId ? card(heroId) : null) ?? FALLBACK_CARD(heroId),
      backup: backupId ? card(backupId) : null,
    },
  };
}

async function loadRestaurantNames(
  db: SupabaseClient
): Promise<Map<string, string>> {
  const { data } = await db.from("restaurants").select("id, name");
  return new Map((data ?? []).map((r) => [r.id as string, r.name as string]));
}
