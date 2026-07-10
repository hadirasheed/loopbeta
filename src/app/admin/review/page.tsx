import { createClient } from "@/lib/supabase/server";
import { ATTRIBUTE_KEYS, type DishAttributes } from "@/lib/types";
import { PageHeader } from "@/components/admin/ui";
import ReviewClient, { type ReviewDish } from "./ReviewClient";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("dishes")
    .select(
      "id, name, image_url, description, attributes, tags, available_dayparts, seasons, restaurant:restaurants(name)"
    )
    .eq("status", "draft")
    .order("created_at", { ascending: false });

  const dishes: ReviewDish[] = (data ?? []).map((d) => {
    const rel = d.restaurant as unknown as { name: string } | { name: string }[] | null;
    const restaurantName = Array.isArray(rel) ? rel[0]?.name : rel?.name;
    const rawAttrs = (d.attributes ?? {}) as Partial<DishAttributes>;
    const attributes = Object.fromEntries(
      ATTRIBUTE_KEYS.map((k) => [k, rawAttrs[k] ?? 0.5])
    ) as DishAttributes;
    return {
      id: d.id,
      name: d.name,
      restaurantName: restaurantName ?? "—",
      image_url: d.image_url,
      description: d.description,
      attributes,
      tags: (d.tags as string[] | null) ?? [],
      available_dayparts: (d.available_dayparts as string[] | null) ?? [],
      seasons: (d.seasons as string[] | null) ?? [],
    };
  });

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <PageHeader
        title="Review drafts"
        description={`${dishes.length} awaiting review — set attributes, tag, and publish.`}
      />

      {dishes.length === 0 ? (
        <p className="rounded-xl border border-black/10 bg-white py-12 text-center text-sm text-ink/40">
          No drafts to review. Imported or newly added dishes show up here.
        </p>
      ) : (
        <ReviewClient dishes={dishes} />
      )}
    </div>
  );
}
