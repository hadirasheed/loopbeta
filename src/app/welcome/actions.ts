"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Result = { error: string } | undefined;

/** Save the user's display name, then continue to onboarding (or home). */
export async function saveName(
  _prev: Result,
  formData: FormData
): Promise<Result> {
  const name = formData.get("name")?.toString().trim();
  if (!name) return { error: "Please enter your name." };
  if (name.length > 60) return { error: "That name is a bit long." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    name,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  const { data: constraints } = await supabase
    .from("user_constraints")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  redirect(constraints ? "/" : "/onboarding");
}
