import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { PageHeader, StatCard, btnAccent, btnGhost } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const supabase = await createClient();

  const [total, published, drafts, restaurants] = await Promise.all([
    supabase.from("dishes").select("id", { count: "exact", head: true }),
    supabase
      .from("dishes")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("dishes")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase.from("restaurants").select("id", { count: "exact", head: true }),
  ]);

  // llm_providers has RLS with no policies — read the active model via service role.
  const { data: activeModel } = await adminClient()
    .from("llm_providers")
    .select("provider, model, label")
    .eq("is_active_for_tagging", true)
    .eq("is_enabled", true)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <PageHeader
        title="Overview"
        description="Your catalog at a glance."
        actions={
          <>
            <Link href="/admin/import" className={btnGhost}>
              Import .xlsx
            </Link>
            <Link href="/admin/dishes/new" className={btnAccent}>
              + Add dish
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total dishes"
          value={total.count ?? 0}
          href="/admin/dishes"
        />
        <StatCard
          label="Published"
          value={published.count ?? 0}
          hint="In the duel pool"
          href="/admin/dishes"
        />
        <StatCard
          label="Drafts"
          value={drafts.count ?? 0}
          hint="Awaiting review"
          href="/admin/review"
        />
        <StatCard
          label="Restaurants"
          value={restaurants.count ?? 0}
          href="/admin/restaurants"
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <h2 className="text-sm font-semibold text-ink">AI tagging</h2>
          {activeModel ? (
            <p className="mt-2 text-sm text-ink/60">
              Active model:{" "}
              <span className="font-semibold text-ink">
                {activeModel.label || activeModel.model}
              </span>{" "}
              <span className="text-ink/40">({activeModel.provider})</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink/60">
              No active tagging model.{" "}
              <Link
                href="/admin/ai-settings"
                className="font-semibold text-accent-dark underline underline-offset-2"
              >
                Configure one →
              </Link>
            </p>
          )}
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-5">
          <h2 className="text-sm font-semibold text-ink">Quick actions</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/admin/dishes/new" className={btnGhost}>
              Add dish
            </Link>
            <Link href="/admin/restaurants" className={btnGhost}>
              Add restaurant
            </Link>
            <Link href="/admin/review" className={btnGhost}>
              Review drafts
            </Link>
            <Link href="/admin/import" className={btnGhost}>
              Bulk import
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
