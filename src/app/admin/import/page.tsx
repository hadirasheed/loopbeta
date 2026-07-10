import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/lib/types";
import { PageHeader } from "@/components/admin/ui";
import ImportClient from "./ImportClient";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const supabase = await createClient();
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name, area")
    .order("name");

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <PageHeader
        title="Bulk import dishes"
        description="Upload an .xlsx to add many dishes to a restaurant as drafts."
      />
      <ImportClient restaurants={(restaurants as Restaurant[] | null) ?? []} />
    </div>
  );
}
