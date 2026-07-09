import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";
import SignOutButton from "@/components/SignOutButton";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts guarantees a signed-in user here, but guard anyway.
  if (!user) redirect("/login");

  // New users (no constraints row yet) go to onboarding first.
  const { data: constraints } = await supabase
    .from("user_constraints")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!constraints) redirect("/onboarding");

  const isAdmin = isAdminEmail(user.email);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6 text-center">
      <div>
        <div className="mb-2 text-5xl">🍽️</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Ready to decide?
        </h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          A few quick picks and we&apos;ll land on one thing to eat.
        </p>
      </div>

      <Link
        href="/duel"
        className="rounded-full bg-black px-8 py-3.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 dark:bg-white dark:text-black"
      >
        Start deciding
      </Link>

      <div className="flex flex-col items-center gap-3 text-sm text-black/50 dark:text-white/50">
        <Link href="/onboarding" className="underline underline-offset-4">
          Edit dietary preferences
        </Link>
        {isAdmin && (
          <Link href="/admin" className="underline underline-offset-4">
            Admin dashboard
          </Link>
        )}
        <SignOutButton />
      </div>
    </main>
  );
}
