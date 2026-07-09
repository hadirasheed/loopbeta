import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DishForm, { type DishFormValues } from "../DishForm";
import {
  ATTRIBUTE_KEYS,
  type DishAttributes,
  type DeliveryApp,
  type Restaurant,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditDishPage(
  ctx: PageProps<"/admin/dishes/[id]">
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const [{ data: dish }, { data: restaurants }] = await Promise.all([
    supabase.from("dishes").select("*").eq("id", id).maybeSingle(),
    supabase.from("restaurants").select("id, name, area").order("name"),
  ]);

  if (!dish) notFound();

  const rawAttrs = (dish.attributes ?? {}) as Partial<DishAttributes>;
  const attributes = Object.fromEntries(
    ATTRIBUTE_KEYS.map((k) => [k, rawAttrs[k] ?? 0.5])
  ) as DishAttributes;

  const initial: DishFormValues = {
    id: dish.id,
    restaurant_id: dish.restaurant_id,
    name: dish.name ?? "",
    image_url: dish.image_url ?? "",
    price: dish.price != null ? String(dish.price) : "",
    description: dish.description ?? "",
    attributes,
    cuisine: dish.cuisine ?? "",
    main_protein: dish.main_protein ?? "",
    prep_style: dish.prep_style ?? "",
    is_veg: dish.is_veg ?? false,
    is_halal: dish.is_halal ?? true,
    allergens: (dish.allergens as string[] | null) ?? [],
    delivery_apps: (dish.delivery_apps as DeliveryApp[] | null) ?? [],
    tags: (dish.tags as string[] | null) ?? [],
    available_dayparts: (dish.available_dayparts as string[] | null) ?? [],
    seasons: (dish.seasons as string[] | null) ?? [],
    status: dish.status === "published" ? "published" : "draft",
  };

  return (
    <main className="flex flex-1 flex-col gap-6 p-5">
      <h1 className="text-lg font-semibold">Edit dish</h1>
      <DishForm
        restaurants={(restaurants as Restaurant[] | null) ?? []}
        initial={initial}
      />
    </main>
  );
}
