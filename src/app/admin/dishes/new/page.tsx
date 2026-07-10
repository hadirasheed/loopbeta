import { createClient } from "@/lib/supabase/server";
import DishForm, { emptyValues } from "../DishForm";
import type { Restaurant } from "@/lib/types";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function NewDishPage() {
  const supabase = await createClient();
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name, area")
    .order("name");

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-8">
      <PageHeader title="Add dish" />
      <DishForm
        restaurants={(restaurants as Restaurant[] | null) ?? []}
        initial={emptyValues()}
      />
    </div>
  );
}
