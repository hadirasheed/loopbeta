import type { SupabaseClient } from "@supabase/supabase-js";
import {
  coldStartWeights,
  type Dish,
  type TasteWeights,
  type UserConstraints,
} from "@/lib/types";
import type { DuelRecord } from "./session";

/** Map a raw dishes row to the Dish domain type with safe defaults. */
export function mapDish(row: Record<string, unknown>): Dish {
  return {
    id: row.id as string,
    restaurant_id: row.restaurant_id as string,
    name: (row.name as string) ?? "",
    image_url: (row.image_url as string) ?? null,
    price: (row.price as number) ?? null,
    description: (row.description as string) ?? null,
    attributes: (row.attributes as Dish["attributes"]) ?? {
      heaviness: 0,
      spiciness: 0,
      price_tier: 0,
      healthiness: 0,
      adventurousness: 0,
      warmth: 0,
    },
    cuisine: (row.cuisine as string) ?? null,
    main_protein: (row.main_protein as string) ?? null,
    prep_style: (row.prep_style as string) ?? null,
    is_veg: Boolean(row.is_veg),
    is_halal: row.is_halal !== false,
    allergens: (row.allergens as string[]) ?? [],
    delivery_apps: (row.delivery_apps as Dish["delivery_apps"]) ?? [],
    tags: (row.tags as string[]) ?? [],
    available_dayparts: (row.available_dayparts as string[]) ?? [],
    seasons: (row.seasons as string[]) ?? [],
    status: (row.status as Dish["status"]) ?? "draft",
  };
}

/** Load the duel pool: published dishes only. */
export async function loadDishes(db: SupabaseClient): Promise<Dish[]> {
  const { data, error } = await db
    .from("dishes")
    .select("*")
    .eq("status", "published");
  if (error) throw error;
  return (data ?? []).map(mapDish);
}

export async function loadConstraints(
  db: SupabaseClient,
  userId: string
): Promise<UserConstraints | null> {
  const { data } = await db
    .from("user_constraints")
    .select("user_id, is_veg, is_halal, allergens")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as UserConstraints | null) ?? null;
}

/** Load taste weights, creating a cold-start row if the user has none. */
export async function loadOrInitTaste(
  db: SupabaseClient,
  userId: string
): Promise<TasteWeights> {
  const { data } = await db
    .from("user_taste")
    .select("weights")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.weights) return data.weights as TasteWeights;

  const weights = coldStartWeights();
  await db.from("user_taste").insert({
    user_id: userId,
    weights,
    updated_at: new Date().toISOString(),
  });
  return weights;
}

export async function loadDuels(
  db: SupabaseClient,
  sessionId: string
): Promise<DuelRecord[]> {
  const { data, error } = await db
    .from("duels")
    .select("dish_a, dish_b, winner, round_index")
    .eq("session_id", sessionId)
    .order("round_index", { ascending: true });
  if (error) throw error;
  return (data as DuelRecord[]) ?? [];
}
