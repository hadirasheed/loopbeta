import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { activeTaggerInfo } from "@/lib/ai/providers";
import DishForm from "../DishForm";
import { emptyValues } from "../form-values";
import type { Restaurant } from "@/lib/types";
import { PageHeader } from "@/components/admin/ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewDishPage() {
  const supabase = await createClient();
  const [{ data: restaurants }, activeModel] = await Promise.all([
    supabase.from("restaurants").select("id, name, area").order("name"),
    activeTaggerInfo(adminClient()).catch(() => null),
  ]);

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-8">
      <PageHeader title="Add dish" />
      <DishForm
        restaurants={(restaurants as Restaurant[] | null) ?? []}
        initial={emptyValues()}
        activeModel={activeModel}
      />
    </div>
  );
}
