"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Frame from "@/components/Frame";
import Logo from "@/components/Logo";
import DuelHero from "@/components/DuelHero";

function LoginInner() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const authError = searchParams.get("error");

  async function signInWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    const next = searchParams.get("next") ?? "/";
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      next
    )}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setLoading(false);
  }

  return (
    <Frame>
      <main className="anim-screenIn flex flex-1 flex-col items-center px-[26px] pb-[calc(26px+env(safe-area-inset-bottom))]">
        <div className="mt-[46px]">
          <Logo size={52} wordmarkSize={34} />
        </div>

        {/* Hero: two tilted floating cards + VS */}
        <div className="flex min-h-0 w-full flex-1 items-center justify-center">
          <DuelHero />
        </div>

        <div className="mb-[22px] text-center">
          <h1 className="text-[27px] font-bold leading-[1.1] tracking-[-0.5px] text-ink">
            Can&apos;t decide
            <br />
            what to eat?
          </h1>
          <p className="mt-[9px] font-[family-name:var(--font-body)] text-[15px] font-bold text-muted">
            Two dishes. One tap. Zero overthinking.
          </p>
        </div>

        {authError && (
          <p className="mb-3 w-full rounded-xl border-[2.5px] border-ink bg-[#ffd400] px-3 py-2 text-center text-[13px] font-semibold text-ink">
            Sign-in didn&apos;t complete. Please try again.
          </p>
        )}

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="press flex h-[58px] w-full items-center justify-center gap-[11px] rounded-2xl border-[3px] border-ink bg-card text-[17px] font-semibold text-ink shadow-pop disabled:opacity-60"
        >
          <GoogleIcon />
          {loading ? "Redirecting…" : "Sign in with Google"}
        </button>

        <p className="mt-[14px] text-center font-[family-name:var(--font-body)] text-[11px] font-semibold text-muted2">
          By continuing you agree to our Terms &amp; Privacy.
        </p>
      </main>
    </Frame>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
