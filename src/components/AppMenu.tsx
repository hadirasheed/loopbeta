"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Hamburger button that opens a bottom tray with the account name, an
 * edit-preferences link, and sign out. Rendered inside the 430px app frame.
 */
export default function AppMenu({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Menu"
        className="press flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-ink bg-card shadow-hard-sm"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#161512"
          strokeWidth="2.6"
          strokeLinecap="round"
        >
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-center"
          onClick={() => setOpen(false)}
        >
          <div className="relative w-full max-w-[430px]">
            <div className="absolute inset-0 bg-ink/40" />
            <div
              className="anim-dropInBottom absolute inset-x-0 bottom-0 rounded-t-[24px] border-t-[3px] border-ink bg-paper px-5 pb-[calc(22px+env(safe-area-inset-bottom))] pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink/20" />

              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-accent text-[18px] font-bold text-ink">
                  {(name || "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[16px] font-bold text-ink">
                    {name}
                  </div>
                  <div className="truncate font-[family-name:var(--font-body)] text-[12px] font-semibold text-muted2">
                    {email}
                  </div>
                </div>
              </div>

              <Link
                href="/onboarding"
                className="press mb-2 flex items-center gap-3 rounded-2xl border-[3px] border-ink bg-card px-4 py-[13px] text-[15px] font-semibold text-ink shadow-hard-sm"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#161512"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Edit preferences
              </Link>

              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="press flex w-full items-center gap-3 rounded-2xl border-[3px] border-ink bg-card px-4 py-[13px] text-left text-[15px] font-semibold text-ink shadow-hard-sm"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#161512"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
