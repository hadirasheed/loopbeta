"use client";

import { useActionState } from "react";
import { saveName } from "./actions";
import Frame from "@/components/Frame";
import Logo from "@/components/Logo";

export default function WelcomeForm({ initialName }: { initialName: string }) {
  const [state, formAction, pending] = useActionState(saveName, undefined);

  return (
    <Frame>
      <main className="anim-screenIn flex flex-1 flex-col items-center justify-center px-[26px] pb-[calc(26px+env(safe-area-inset-bottom))]">
        <Logo size={52} wordmarkSize={34} />

        <div className="mt-10 mb-[22px] text-center">
          <h1 className="text-[27px] font-bold leading-[1.1] tracking-[-0.5px] text-ink">
            What should we
            <br />
            call you?
          </h1>
          <p className="mt-[9px] font-[family-name:var(--font-body)] text-[15px] font-bold text-muted">
            Just a first name is perfect.
          </p>
        </div>

        <form action={formAction} className="flex w-full flex-col gap-3">
          <input
            name="name"
            defaultValue={initialName}
            autoFocus
            maxLength={60}
            placeholder="Your name"
            className="h-[56px] w-full rounded-2xl border-[3px] border-ink bg-card px-4 text-center text-[18px] font-semibold text-ink shadow-hard outline-none placeholder:text-muted2"
          />

          {state?.error && (
            <p className="rounded-xl border-[2.5px] border-ink bg-[#ffd400] px-3 py-2 text-center text-[13px] font-semibold text-ink">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="press flex h-[56px] w-full items-center justify-center gap-[9px] rounded-2xl border-[3px] border-ink bg-accent text-[17px] font-bold text-ink shadow-pop disabled:opacity-60"
          >
            {pending ? "Saving…" : "Continue"}
            {!pending && (
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
            )}
          </button>
        </form>
      </main>
    </Frame>
  );
}
