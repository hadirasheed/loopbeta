import { createClient } from "@/lib/supabase/server";
import DishForm, { emptyValues } from "../DishForm";
import type { Restaurant } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewDishPage() {
  const supabase = await createClient();
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name, area")
    .order("name");

  return (
    <main className="flex flex-1 flex-col gap-6 p-5">
      <h1 className="text-lg font-semibold">Add dish</h1>
      <DishForm
        restaurants={(restaurants as Restaurant[] | null) ?? []}
        initial={emptyValues()}
      />
    </main>
  );
}
