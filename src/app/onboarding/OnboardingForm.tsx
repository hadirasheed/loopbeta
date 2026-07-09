"use client";

import { useActionState } from "react";
import { saveConstraints } from "./actions";
import { ALLERGEN_OPTIONS } from "@/lib/types";

interface Props {
  initial: {
    is_veg: boolean;
    is_halal: boolean;
    allergens: string[];
  };
}

export default function OnboardingForm({ initial }: Props) {
  const [state, formAction, pending] = useActionState(
    saveConstraints,
    undefined
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-6">
      <div className="mb-8">
        <div className="mb-2 text-4xl">🍽️</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          A couple of ground rules
        </h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          These are permanent filters — we&apos;ll never suggest anything that
          breaks them. You can change them anytime.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium">Diet</legend>
          <Toggle
            name="is_veg"
            label="Vegetarian"
            hint="Only show vegetarian dishes"
            defaultChecked={initial.is_veg}
          />
          <Toggle
            name="is_halal"
            label="Halal only"
            hint="Only show halal-friendly dishes"
            defaultChecked={initial.is_halal}
          />
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-medium">
            Allergies — hide anything containing
          </legend>
          <div className="flex flex-wrap gap-2">
            {ALLERGEN_OPTIONS.map((a) => (
              <AllergenChip
                key={a}
                allergen={a}
                defaultChecked={initial.allergens.includes(a)}
              />
            ))}
          </div>
        </fieldset>

        {state?.error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-full bg-black px-6 py-3.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {pending ? "Saving…" : "Save and start"}
        </button>
      </form>
    </main>
  );
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-black/10 p-4 transition hover:bg-black/[0.02] dark:border-white/15 dark:hover:bg-white/5">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-black/50 dark:text-white/50">
          {hint}
        </span>
      </span>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-5 w-5 accent-black dark:accent-white"
      />
    </label>
  );
}

function AllergenChip({
  allergen,
  defaultChecked,
}: {
  allergen: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="checkbox"
        name={`allergen_${allergen}`}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="inline-block rounded-full border border-black/15 px-4 py-2 text-sm capitalize transition peer-checked:border-black peer-checked:bg-black peer-checked:text-white dark:border-white/20 dark:peer-checked:border-white dark:peer-checked:bg-white dark:peer-checked:text-black">
        {allergen}
      </span>
    </label>
  );
}
