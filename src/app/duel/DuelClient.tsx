"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface DeliveryApp {
  app: string;
  url: string;
}

interface DishCard {
  id: string;
  name: string;
  restaurantName: string;
  price: number | null;
  description: string | null;
  image_url: string | null;
  cuisine: string | null;
  delivery_apps: DeliveryApp[];
}

type StepPayload =
  | {
      done: false;
      sessionId: string;
      roundIndex: number;
      pair: { a: DishCard; b: DishCard };
    }
  | {
      done: true;
      sessionId: string;
      result: { hero: DishCard; backup: DishCard | null };
    };

const MOODS = [
  { key: "starving", label: "Starving", emoji: "🤤" },
  { key: "peckish", label: "Peckish", emoji: "🙂" },
  { key: "browsing", label: "Just browsing", emoji: "👀" },
] as const;

export default function DuelClient() {
  const router = useRouter();
  const [payload, setPayload] = useState<StepPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(url: string, body: unknown) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setPayload(data as StepPayload);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function startSession(mood: string | null) {
    call("/api/session", { mood });
  }

  function pick(winner: "a" | "b" | "neither") {
    if (!payload || payload.done) return;
    call("/api/record-duel", {
      sessionId: payload.sessionId,
      dishA: payload.pair.a.id,
      dishB: payload.pair.b.id,
      winner,
    });
  }

  // --- Mood / start screen ---------------------------------------------------
  if (!payload) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 p-6 text-center">
        <div>
          <div className="mb-2 text-5xl">🍽️</div>
          <h1 className="text-2xl font-semibold tracking-tight">
            How hungry are you?
          </h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Optional — it just sets the mood. Then we start the duels.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {MOODS.map((m) => (
            <button
              key={m.key}
              disabled={loading}
              onClick={() => startSession(m.key)}
              className="flex items-center gap-3 rounded-2xl border border-black/10 px-5 py-4 text-left text-sm font-medium transition hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5"
            >
              <span className="text-2xl">{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>

        <button
          disabled={loading}
          onClick={() => startSession(null)}
          className="text-sm text-black/50 underline underline-offset-4 disabled:opacity-50 dark:text-white/50"
        >
          {loading ? "Starting…" : "Skip"}
        </button>

        {error && <ErrorNote message={error} />}
      </main>
    );
  }

  // --- Result screen ---------------------------------------------------------
  if (payload.done) {
    const { hero, backup } = payload.result;
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
            You should eat
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {hero.name}
          </h1>
        </div>

        <HeroCard dish={hero} />

        {backup && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
              Or a solid backup
            </p>
            <BackupCard dish={backup} />
          </div>
        )}

        <div className="mt-2 flex flex-col items-center gap-3">
          <button
            onClick={() => setPayload(null)}
            className="rounded-full border border-black/15 px-6 py-3 text-sm dark:border-white/20"
          >
            Decide again
          </button>
          <Link
            href="/"
            className="text-sm text-black/50 underline underline-offset-4 dark:text-white/50"
          >
            Back home
          </Link>
        </div>
      </main>
    );
  }

  // --- Duel screen -----------------------------------------------------------
  const { a, b } = payload.pair;
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-4">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-xs font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
          Round {payload.roundIndex + 1}
        </span>
        <button
          onClick={() => router.push("/")}
          className="text-xs text-black/40 underline underline-offset-4 dark:text-white/40"
        >
          Quit
        </button>
      </div>

      <p className="mb-4 text-center text-sm text-black/60 dark:text-white/60">
        Which sounds better right now?
      </p>

      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
        <DuelCard dish={a} disabled={loading} onPick={() => pick("a")} />
        <DuelCard dish={b} disabled={loading} onPick={() => pick("b")} />
      </div>

      <button
        disabled={loading}
        onClick={() => pick("neither")}
        className="mt-4 self-center rounded-full border border-black/15 px-6 py-2.5 text-sm text-black/60 transition hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/20 dark:text-white/60 dark:hover:bg-white/5"
      >
        Neither
      </button>

      {error && (
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      )}
    </main>
  );
}

function DuelCard({
  dish,
  disabled,
  onPick,
}: {
  dish: DishCard;
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onPick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 text-left transition hover:border-black/30 hover:shadow-lg disabled:opacity-60 dark:border-white/15 dark:hover:border-white/40"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-black/5 dark:bg-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dish.image_url ?? ""}
          alt={dish.name}
          className="h-full w-full object-cover transition group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-semibold leading-tight">{dish.name}</h2>
          {dish.price != null && (
            <span className="shrink-0 text-sm font-medium tabular-nums">
              {dish.price}
            </span>
          )}
        </div>
        <p className="text-xs text-black/50 dark:text-white/50">
          {dish.restaurantName}
        </p>
        {dish.description && (
          <p className="mt-1 line-clamp-2 text-xs text-black/60 dark:text-white/60">
            {dish.description}
          </p>
        )}
        {dish.delivery_apps.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1 pt-2">
            {dish.delivery_apps.map((d) => (
              <span
                key={d.app}
                className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium capitalize text-black/60 dark:bg-white/10 dark:text-white/60"
              >
                {d.app}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function HeroCard({ dish }: { dish: DishCard }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/15">
      <div className="aspect-[16/10] w-full overflow-hidden bg-black/5 dark:bg-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dish.image_url ?? ""}
          alt={dish.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{dish.name}</h2>
            <p className="text-sm text-black/50 dark:text-white/50">
              {dish.restaurantName}
            </p>
          </div>
          {dish.price != null && (
            <span className="text-lg font-semibold tabular-nums">
              {dish.price}
            </span>
          )}
        </div>
        {dish.description && (
          <p className="text-sm text-black/60 dark:text-white/60">
            {dish.description}
          </p>
        )}
        {dish.delivery_apps.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {dish.delivery_apps.map((d) => (
              <a
                key={d.app}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-black px-4 py-2 text-sm font-medium capitalize text-white dark:bg-white dark:text-black"
              >
                Order on {d.app}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BackupCard({ dish }: { dish: DishCard }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/10 p-3 dark:border-white/15">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dish.image_url ?? ""}
        alt={dish.name}
        className="h-14 w-14 shrink-0 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{dish.name}</p>
        <p className="truncate text-xs text-black/50 dark:text-white/50">
          {dish.restaurantName}
        </p>
      </div>
      {dish.delivery_apps[0] && (
        <a
          href={dish.delivery_apps[0].url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium capitalize dark:border-white/20"
        >
          {dish.delivery_apps[0].app}
        </a>
      )}
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}
