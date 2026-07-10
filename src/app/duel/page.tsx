import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DuelClient from "./DuelClient";

export const dynamic = "force-dynamic";

export default async function DuelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Must have completed onboarding (hard constraints) before dueling.
  const { data: constraints } = await supabase
    .from("user_constraints")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!constraints) redirect("/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("user_id", user.id)
    .maybeSingle();

  const meta = user.user_metadata ?? {};
  const name =
    profile?.name ||
    (meta.full_name as string) ||
    (meta.name as string) ||
    user.email?.split("@")[0] ||
    "You";

  return <DuelClient accountName={name} accountEmail={user.email ?? ""} />;
}
