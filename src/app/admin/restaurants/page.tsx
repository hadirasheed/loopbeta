import { createClient } from "@/lib/supabase/server";
import RestaurantsManager, { type RestaurantRow } from "./RestaurantsManager";

export const dynamic = "force-dynamic";

export default async function RestaurantsPage() {
  const supabase = await createClient();

  const [{ data: restaurants }, { data: dishes }] = await Promise.all([
    supabase.from("restaurants").select("id, name, area").order("name"),
    supabase.from("dishes").select("restaurant_id"),
  ]);

  const counts = new Map<string, number>();
  for (const d of dishes ?? []) {
    const id = d.restaurant_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const rows: RestaurantRow[] = (restaurants ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    area: r.area,
    dishCount: counts.get(r.id) ?? 0,
  }));

  return <RestaurantsManager rows={rows} />;
}
