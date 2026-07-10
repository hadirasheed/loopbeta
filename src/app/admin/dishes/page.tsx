import { createClient } from "@/lib/supabase/server";
import DishesManager, { type DishRow } from "./DishesManager";
import type { Restaurant } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DishesPage() {
  const supabase = await createClient();

  const [{ data: dishes }, { data: restaurants }] = await Promise.all([
    supabase
      .from("dishes")
      .select(
        "id, name, price, cuisine, main_protein, image_url, status, is_veg, is_halal, restaurant_id, restaurant:restaurants(name)"
      )
      .order("name"),
    supabase.from("restaurants").select("id, name, area").order("name"),
  ]);

  const rows: DishRow[] = (dishes ?? []).map((d) => {
    const rel = d.restaurant as unknown as { name: string } | { name: string }[] | null;
    const restaurantName = Array.isArray(rel) ? rel[0]?.name : rel?.name;
    return {
      id: d.id,
      name: d.name,
      price: d.price,
      cuisine: d.cuisine,
      main_protein: d.main_protein,
      image_url: d.image_url,
      status: d.status === "published" ? "published" : "draft",
      is_veg: Boolean(d.is_veg),
      is_halal: d.is_halal !== false,
      restaurant_id: d.restaurant_id,
      restaurantName: restaurantName ?? "—",
    };
  });

  return (
    <DishesManager
      dishes={rows}
      restaurants={(restaurants as Restaurant[] | null) ?? []}
    />
  );
}
