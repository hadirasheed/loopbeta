import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/lib/types";
import ImportClient from "./ImportClient";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const supabase = await createClient();
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name, area")
    .order("name");

  return (
    <main className="flex flex-1 flex-col gap-6 p-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Bulk import dishes</h1>
        <Link
          href="/admin"
          className="text-sm text-black/50 underline underline-offset-4 dark:text-white/50"
        >
          Back to catalog
        </Link>
      </div>
      <ImportClient restaurants={(restaurants as Restaurant[] | null) ?? []} />
    </main>
  );
}
