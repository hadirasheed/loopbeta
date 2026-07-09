import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DishList, { type DishRow } from "./DishList";
import RestaurantManager from "./RestaurantManager";
import type { Restaurant } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const supabase = await createClient();

  const [{ data: dishes }, { data: restaurants }] = await Promise.all([
    supabase
      .from("dishes")
      .select(
        "id, name, price, cuisine, image_url, status, restaurant:restaurants(name)"
      )
      .order("name"),
    supabase.from("restaurants").select("id, name, area").order("name"),
  ]);

  // Supabase types the embedded relation as an array; flatten to a name.
  const dishRows: DishRow[] = (dishes ?? []).map((d) => {
    const rel = d.restaurant as unknown as { name: string } | { name: string }[] | null;
    const restaurantName = Array.isArray(rel) ? rel[0]?.name : rel?.name;
    return {
      id: d.id,
      name: d.name,
      price: d.price,
      cuisine: d.cuisine,
      image_url: d.image_url,
      status: d.status === "published" ? "published" : "draft",
      restaurantName: restaurantName ?? "—",
    };
  });

  const draftCount = dishRows.filter((d) => d.status === "draft").length;

  return (
    <main className="flex flex-1 flex-col gap-10 p-5">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">
            Dishes{" "}
            <span className="text-sm font-normal text-black/40 dark:text-white/40">
              ({dishRows.length})
            </span>
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/import"
              className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium dark:border-white/20"
            >
              Import .xlsx
            </Link>
            <Link
              href="/admin/review"
              className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium dark:border-white/20"
            >
              Review drafts
              {draftCount > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-xs text-white">
                  {draftCount}
                </span>
              )}
            </Link>
            <Link
              href="/admin/dishes/new"
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              + Add dish
            </Link>
          </div>
        </div>
        <DishList dishes={dishRows} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Restaurants</h2>
        <RestaurantManager
          initial={(restaurants as Restaurant[] | null) ?? []}
        />
      </section>
    </main>
  );
}
