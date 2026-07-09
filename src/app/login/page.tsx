"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    if (error) {
      setLoading(false);
    }
    // On success the browser is redirected to Google, so no further UI needed.
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-2 text-5xl">🍽️</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          What Should I Eat
        </h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          A few quick this-or-that picks and we&apos;ll commit to one thing
          for you.
        </p>

        {authError && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            Sign-in didn&apos;t complete. Please try again.
          </p>
        )}

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-black shadow-sm transition hover:bg-black/5 disabled:opacity-60 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
        >
          <GoogleIcon />
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>
      </div>
    </main>
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
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
