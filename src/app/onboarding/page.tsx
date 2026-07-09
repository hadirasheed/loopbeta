import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Prefill when editing existing preferences.
  const { data: constraints } = await supabase
    .from("user_constraints")
    .select("is_veg, is_halal, allergens")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <OnboardingForm
      initial={{
        is_veg: constraints?.is_veg ?? false,
        is_halal: constraints?.is_halal ?? false,
        allergens: constraints?.allergens ?? [],
      }}
    />
  );
}
