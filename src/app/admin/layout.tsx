import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  // Server-side gate: non-admins never see admin UI. Write APIs re-check too.
  if (!isAdminEmail(user.email)) redirect("/");

  const { count } = await supabase
    .from("dishes")
    .select("id", { count: "exact", head: true })
    .eq("status", "draft");

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#f4f3ee] font-[family-name:var(--font-body)] text-ink md:flex-row">
      <AdminNav email={user.email ?? ""} draftCount={count ?? 0} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
