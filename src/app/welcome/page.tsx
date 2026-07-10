import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WelcomeForm from "./WelcomeForm";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("user_id", user.id)
    .maybeSingle();

  // Already named — skip to the right next step.
  if (profile?.name) {
    const { data: constraints } = await supabase
      .from("user_constraints")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    redirect(constraints ? "/" : "/onboarding");
  }

  const meta = user.user_metadata ?? {};
  const suggested =
    (meta.full_name as string) || (meta.name as string) || "";

  return <WelcomeForm initialName={suggested} />;
}
