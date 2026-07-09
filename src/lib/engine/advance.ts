import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dish, DeliveryApp } from "@/lib/types";
import { filterEligible } from "./constraints";
import {
  currentDaypart,
  currentSeason,
  filterByAvailability,
} from "./time-context";
import {
  deriveState,
  nextStep,
  type NextStep,
} from "./session";
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
  const [dishes, constraints, weights, duels, restaurantNames] =
    await Promise.all([
      loadDishes(db),
      loadConstraints(db, userId),
      loadOrInitTaste(db, userId),
      loadDuels(db, sessionId),
      loadRestaurantNames(db),
    ]);

  // Duel pool = published (loadDishes) ∩ available now (daypart/season) ∩
  // within the user's hard constraints.
  const now = new Date();
  const available = filterByAvailability(
    dishes,
    currentDaypart(now),
    currentSeason(now)
  );
  const eligible = filterEligible(available, constraints);
  const dishById = new Map(dishes.map((d) => [d.id, d]));
  const state = deriveState(duels);
  const step: NextStep = nextStep(eligible, state, weights);

  const card = (id: string): DishCard | null => {
    const d = dishById.get(id);
    if (!d) return null;
    return buildCard(d, restaurantNames.get(d.restaurant_id) ?? "—");
  };

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
      result: {
        hero:
          hero ??
          ({
            id: step.heroId,
            name: "Your pick",
            restaurantName: "—",
            price: null,
            description: null,
            image_url: null,
            cuisine: null,
            delivery_apps: [],
          } as DishCard),
        backup,
      },
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

async function loadRestaurantNames(
  db: SupabaseClient
): Promise<Map<string, string>> {
  const { data } = await db.from("restaurants").select("id, name");
  return new Map((data ?? []).map((r) => [r.id as string, r.name as string]));
}
