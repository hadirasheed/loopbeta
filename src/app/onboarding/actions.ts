"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { coldStartWeights, ALLERGEN_OPTIONS } from "@/lib/types";

type OnboardingResult = { error: string } | undefined;

/**
 * Saves the user's hard constraints (permanent filters) and ensures a
 * cold-start user_taste row exists, then sends them to the duel flow.
 */
export async function saveConstraints(
  _prev: OnboardingResult,
  formData: FormData
): Promise<OnboardingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const isVeg = formData.get("is_veg") === "on";
  const isHalal = formData.get("is_halal") === "on";
  const allergens = ALLERGEN_OPTIONS.filter(
    (a) => formData.get(`allergen_${a}`) === "on"
  );

  const { error: cError } = await supabase.from("user_constraints").upsert({
    user_id: user.id,
    is_veg: isVeg,
    is_halal: isHalal,
    allergens,
    updated_at: new Date().toISOString(),
  });
  if (cError) return { error: cError.message };

  // Ensure a cold-start taste row exists (mean 0, var 1 on every attribute).
  // Don't overwrite an existing one — the user may already have learned taste.
  const { data: existingTaste } = await supabase
    .from("user_taste")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existingTaste) {
    const { error: tError } = await supabase.from("user_taste").insert({
      user_id: user.id,
      weights: coldStartWeights(),
      updated_at: new Date().toISOString(),
    });
    if (tError) return { error: tError.message };
  }

  redirect("/duel");
}
