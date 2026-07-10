import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";
import Frame from "@/components/Frame";
import Logo from "@/components/Logo";
import DuelHero from "@/components/DuelHero";
import SignOutButton from "@/components/SignOutButton";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // New users pick a name first, then set preferences.
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.name) redirect("/welcome");

  const { data: constraints } = await supabase
    .from("user_constraints")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!constraints) redirect("/onboarding");

  const isAdmin = isAdminEmail(user.email);

  return (
    <Frame>
      <main className="anim-screenIn flex flex-1 flex-col items-center px-[26px] pb-[calc(26px+env(safe-area-inset-bottom))]">
        <div className="mt-[46px]">
          <Logo size={52} wordmarkSize={34} />
        </div>

        <div className="flex min-h-0 w-full flex-1 items-center justify-center">
          <DuelHero />
        </div>

        <div className="mb-[22px] text-center">
          <h1 className="text-[27px] font-bold leading-[1.1] tracking-[-0.5px] text-ink">
            Ready when
            <br />
            you are.
          </h1>
          <p className="mt-[9px] font-[family-name:var(--font-body)] text-[15px] font-bold text-muted">
            A few quick taps and we&apos;ll land on one thing.
          </p>
        </div>

        <Link
          href="/duel"
          className="press flex h-[58px] w-full items-center justify-center gap-[9px] rounded-2xl border-[3px] border-ink bg-accent text-[17px] font-bold text-ink shadow-pop"
        >
          Start deciding
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#161512"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </Link>

        <div className="mt-[16px] flex items-center gap-3 font-[family-name:var(--font-body)] text-[12px] font-semibold text-muted2">
          <Link href="/onboarding" className="underline-offset-4 hover:underline">
            Edit preferences
          </Link>
          {isAdmin && (
            <>
              <span aria-hidden>·</span>
              <Link href="/admin" className="underline-offset-4 hover:underline">
                Admin
              </Link>
            </>
          )}
          <span aria-hidden>·</span>
          <SignOutButton />
        </div>
      </main>
    </Frame>
  );
}
