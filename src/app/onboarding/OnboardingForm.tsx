"use client";

import { useActionState, useState } from "react";
import { saveConstraints } from "./actions";
import { ALLERGEN_OPTIONS } from "@/lib/types";
import Frame from "@/components/Frame";

// Taste interests are shown for a warmer cold-start; not persisted in v1.
const TASTES = [
  "Burgers",
  "Asian",
  "Middle Eastern",
  "Italian",
  "Healthy",
  "Spicy",
  "Sweet tooth",
  "Seafood",
  "Comfort food",
];

const ALLERGEN_EMOJI: Record<string, string> = {
  dairy: "🧀",
  gluten: "🌾",
  egg: "🥚",
  peanut: "🥜",
  nuts: "🌰",
  soy: "🫘",
  shellfish: "🦐",
  fish: "🐟",
  sesame: "◦",
};

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
  const [veg, setVeg] = useState(initial.is_veg);
  const [halal, setHalal] = useState(initial.is_halal);
  const [allergens, setAllergens] = useState<string[]>(initial.allergens);
  const [tastes, setTastes] = useState<string[]>([]);

  function toggle(list: string[], v: string) {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  return (
    <Frame>
      <form
        action={formAction}
        className="anim-screenIn flex min-h-0 flex-1 flex-col"
      >
        {/* hidden fields carry the toggle/chip state into the server action */}
        <input type="hidden" name="is_veg" value={veg ? "on" : ""} />
        <input type="hidden" name="is_halal" value={halal ? "on" : ""} />
        {ALLERGEN_OPTIONS.map((a) => (
          <input
            key={a}
            type="hidden"
            name={`allergen_${a}`}
            value={allergens.includes(a) ? "on" : ""}
          />
        ))}

        {/* header */}
        <div className="px-6 pb-[10px] pt-6">
          <span className="inline-flex items-center gap-[7px] rounded-full border-[2.5px] border-ink bg-accent px-[11px] py-[3px] font-[family-name:var(--font-body)] text-[12px] font-bold text-ink shadow-hard-sm">
            SET UP · takes 20 sec
          </span>
          <h1 className="mt-3 text-[28px] font-bold leading-[1.08] tracking-[-0.6px] text-ink">
            What should we
            <br />
            never show you?
          </h1>
        </div>

        {/* scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-3 pt-[6px]">
          <SectionLabel>Hard limits</SectionLabel>

          <ToggleRow
            emoji="🥦"
            title="Vegetarian"
            sub="No meat, ever"
            on={veg}
            onToggle={() => setVeg((v) => !v)}
          />
          <ToggleRow
            emoji="🌙"
            title="Halal only"
            sub="Halal-certified spots"
            on={halal}
            onToggle={() => setHalal((v) => !v)}
            className="mb-5"
          />

          <SectionLabel>Allergens to avoid</SectionLabel>
          <div className="mb-5 flex flex-wrap gap-2">
            {ALLERGEN_OPTIONS.map((a) => (
              <Chip
                key={a}
                label={`${ALLERGEN_EMOJI[a] ?? ""} ${a}`.trim()}
                selected={allergens.includes(a)}
                onClick={() => setAllergens((l) => toggle(l, a))}
              />
            ))}
          </div>

          <SectionLabel>What are you into?</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {TASTES.map((t) => (
              <Chip
                key={t}
                label={t}
                selected={tastes.includes(t)}
                onClick={() => setTastes((l) => toggle(l, t))}
              />
            ))}
          </div>
        </div>

        {/* footer */}
        <div className="border-t-[2.5px] border-ink/10 px-6 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3">
          {state?.error && (
            <p className="mb-3 rounded-xl border-[2.5px] border-ink bg-[#ffd400] px-3 py-2 text-center text-[13px] font-semibold text-ink">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="press flex h-[56px] w-full items-center justify-center gap-[9px] rounded-2xl border-[3px] border-ink bg-accent text-[17px] font-bold text-ink shadow-pop disabled:opacity-60"
          >
            {pending ? "Saving…" : "Start deciding"}
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
        </div>
      </form>
    </Frame>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-[10px] mt-2 font-[family-name:var(--font-body)] text-[12px] font-extrabold uppercase tracking-[0.6px] text-muted2">
      {children}
    </div>
  );
}

function ToggleRow({
  emoji,
  title,
  sub,
  on,
  onToggle,
  className = "mb-[11px]",
}: {
  emoji: string;
  title: string;
  sub: string;
  on: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center gap-3 rounded-2xl border-[3px] border-ink bg-card px-[15px] py-[13px] text-left shadow-hard ${className}`}
    >
      <span className="text-[22px]">{emoji}</span>
      <span className="flex-1">
        <span className="block text-[16px] font-semibold text-ink">{title}</span>
        <span className="block font-[family-name:var(--font-body)] text-[12px] font-semibold text-muted2">
          {sub}
        </span>
      </span>
      <span
        className={`relative h-[30px] w-[52px] shrink-0 rounded-full border-[2.5px] border-ink transition-colors ${
          on ? "bg-accent" : "bg-[#e2e0d6]"
        }`}
      >
        <span
          className="absolute top-[2px] h-[22px] w-[22px] rounded-full border-2 border-ink bg-white transition-all"
          style={{ left: on ? 24 : 2 }}
        />
      </span>
    </button>
  );
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border-[2.5px] border-ink px-[14px] py-2 font-[family-name:var(--font-body)] text-[13.5px] font-bold capitalize text-ink transition-colors ${
        selected ? "bg-accent shadow-hard-sm" : "bg-card"
      }`}
    >
      {label}
    </button>
  );
}
