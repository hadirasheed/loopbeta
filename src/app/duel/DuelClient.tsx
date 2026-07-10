"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Frame from "@/components/Frame";
import Logo from "@/components/Logo";
import AppMenu from "@/components/AppMenu";

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

type Picked = "top" | "bottom" | "skip" | null;

// ---- Delivery brand marks ---------------------------------------------------
const BRANDS: Record<string, { short: string; bg: string; fg: string }> = {
  talabat: { short: "t", bg: "#ff5a00", fg: "#ffffff" },
  keeta: { short: "K", bg: "#ffd400", fg: "#161512" },
  snoonu: { short: "s", bg: "#5b2be0", fg: "#ffffff" },
  deliveroo: { short: "d", bg: "#00ccbc", fg: "#161512" },
};
function brand(app: string) {
  return (
    BRANDS[app.toLowerCase()] ?? {
      short: app.slice(0, 1).toLowerCase(),
      bg: "#ffffff",
      fg: "#161512",
    }
  );
}

export default function DuelClient({
  accountName,
  accountEmail,
}: {
  accountName: string;
  accountEmail: string;
}) {
  const [payload, setPayload] = useState<StepPayload | null>(null);
  const [picked, setPicked] = useState<Picked>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startSession = useCallback(async () => {
    setError(null);
    setPicked(null);
    setPayload(null);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't start.");
        return;
      }
      setPayload(data as StepPayload);
    } catch {
      setError("Network error.");
    }
  }, []);

  useEffect(() => {
    startSession();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [startSession]);

  function pick(winner: "a" | "b" | "neither") {
    if (!payload || payload.done || picked) return;
    const { sessionId, pair } = payload;
    setPicked(winner === "a" ? "top" : winner === "b" ? "bottom" : "skip");
    // Let the pick animation play, then advance.
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/record-duel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            dishA: pair.a.id,
            dishB: pair.b.id,
            winner,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          setPicked(null);
          return;
        }
        setPayload(data as StepPayload);
        setPicked(null);
      } catch {
        setError("Network error.");
        setPicked(null);
      }
    }, 640);
  }

  // ---- Starting / error -----------------------------------------------------
  if (error && !payload) {
    return (
      <Frame>
        <Starting>
          <p className="rounded-xl border-[2.5px] border-ink bg-[#ffd400] px-4 py-2 text-[14px] font-semibold text-ink">
            {error}
          </p>
          <button
            onClick={startSession}
            className="press mt-4 rounded-2xl border-[3px] border-ink bg-accent px-6 py-3 text-[15px] font-bold text-ink shadow-hard"
          >
            Try again
          </button>
        </Starting>
      </Frame>
    );
  }
  if (!payload) {
    return (
      <Frame>
        <Starting>
          <p className="mt-4 font-[family-name:var(--font-body)] text-[14px] font-bold text-muted">
            Plating up your options…
          </p>
        </Starting>
      </Frame>
    );
  }

  // ---- Result ---------------------------------------------------------------
  if (payload.done) {
    const { hero, backup } = payload.result;
    return (
      <Frame>
        <div className="anim-screenIn flex min-h-0 flex-1 flex-col">
          <div className="px-6 pb-[2px] pt-4 text-center">
            <span className="inline-flex items-center gap-[7px] rounded-full bg-ink px-[13px] py-1 font-[family-name:var(--font-body)] text-[12px] font-bold text-white">
              🎉 DECISION MADE
            </span>
            <h1 className="mt-2 text-[27px] font-bold leading-[1.05] tracking-[-0.6px] text-ink">
              Tonight, eat this.
            </h1>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[6px] pt-[10px]">
            {/* HERO */}
            <div className="anim-resultPop overflow-hidden rounded-[24px] border-[3px] border-ink bg-card shadow-pop">
              <div className="stripes relative h-[146px] border-b-[3px] border-ink">
                {hero.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={hero.image_url}
                    alt={hero.name}
                    className="h-full w-full object-cover"
                  />
                )}
                <span className="absolute left-3 top-3 -rotate-[4deg] rounded-[10px] border-[2.5px] border-ink bg-accent px-[11px] py-[5px] text-[14px] font-bold text-ink shadow-hard-sm">
                  THE WINNER
                </span>
              </div>
              <div className="px-[17px] pb-[17px] pt-[15px]">
                <div className="flex items-start justify-between gap-[10px]">
                  <h2 className="text-[24px] font-bold leading-[1.05] text-ink">
                    {hero.name}
                  </h2>
                  {hero.price != null && <PricePill price={hero.price} />}
                </div>
                <Restaurant name={hero.restaurantName} size={13.5} />
                {hero.description && (
                  <p className="mt-[9px] font-[family-name:var(--font-body)] text-[13.5px] font-semibold leading-[1.4] text-muted">
                    {hero.description}
                  </p>
                )}
                {hero.delivery_apps.length > 0 && (
                  <div className="mt-[15px] flex gap-[9px]">
                    {hero.delivery_apps.map((d) => {
                      const b = brand(d.app);
                      return (
                        <a
                          key={d.app}
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="press flex h-[48px] flex-1 items-center justify-center gap-2 rounded-[13px] border-[3px] border-ink bg-card text-[14px] font-semibold capitalize text-ink shadow-hard"
                        >
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink text-[13px] font-bold"
                            style={{ background: b.bg, color: b.fg }}
                          >
                            {b.short}
                          </span>
                          Order · {d.app}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* BACKUP */}
            {backup && (
              <>
                <div className="mx-[2px] mb-2 mt-[14px] font-[family-name:var(--font-body)] text-[12px] font-extrabold uppercase tracking-[0.6px] text-muted2">
                  If not, then…
                </div>
                <div className="flex items-stretch overflow-hidden rounded-[18px] border-[3px] border-ink bg-card shadow-hard">
                  <div className="stripes relative w-[96px] shrink-0 border-r-[3px] border-ink">
                    {backup.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={backup.image_url}
                        alt={backup.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center px-[13px] py-[11px]">
                    <div className="truncate text-[16px] font-bold leading-[1.05] text-ink">
                      {backup.name}
                    </div>
                    <div className="mt-[3px] truncate text-[12px] font-semibold text-accent-dark">
                      {backup.restaurantName}
                      {backup.price != null ? ` · ${backup.price}` : ""}
                    </div>
                    {backup.delivery_apps.length > 0 && (
                      <div className="mt-[9px] flex gap-[5px]">
                        {backup.delivery_apps.map((d) => (
                          <DeliveryMark key={d.app} app={d.app} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-[10px]">
            <button
              onClick={startSession}
              className="press flex h-[54px] w-full items-center justify-center gap-[9px] rounded-2xl border-[3px] border-ink bg-ink text-[16px] font-bold text-white shadow-pop"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Not feeling it — loop again
            </button>
          </div>
        </div>
      </Frame>
    );
  }

  // ---- Duel -----------------------------------------------------------------
  const { a, b, roundIndex } = { ...payload.pair, roundIndex: payload.roundIndex };
  const topAnim =
    picked === "top"
      ? "anim-winnerPop"
      : picked === "bottom" || picked === "skip"
        ? "anim-loserOutTop"
        : "anim-dropInTop";
  const bottomAnim =
    picked === "bottom"
      ? "anim-winnerPop"
      : picked === "top" || picked === "skip"
        ? "anim-loserOutBottom"
        : "anim-dropInBottom";

  return (
    <Frame>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-[18px] pb-[6px] pt-[14px]">
          <Logo size={34} wordmarkSize={21} />
          <AppMenu name={accountName} email={accountEmail} />
        </div>

        <p className="px-5 pb-2 pt-[2px] text-center font-[family-name:var(--font-body)] text-[13px] font-bold tracking-[0.2px] text-[#6c6a63]">
          Tap the one you&apos;d rather eat right now
        </p>

        <div className="z-[2] flex min-h-0 flex-1 flex-col px-4 pb-[14px] pt-[6px]">
          {/* Equal-height cards; the VS sits at the exact gap between them. */}
          <div className="relative flex min-h-0 flex-1 flex-col gap-[14px]">
            <DuelCard
              key={`t${roundIndex}`}
              dish={a}
              anim={topAnim}
              picked={picked === "top"}
              onPick={() => pick("a")}
            />
            <DuelCard
              key={`b${roundIndex}`}
              dish={b}
              anim={bottomAnim}
              picked={picked === "bottom"}
              onPick={() => pick("b")}
            />

            {!picked && (
              <div
                key={`v${roundIndex}`}
                className="anim-vsPop pointer-events-none absolute left-[24%] top-1/2 z-[5] flex h-[58px] w-[58px] -translate-x-1/2 -translate-y-1/2 -rotate-[8deg] items-center justify-center rounded-full border-[3px] border-white bg-ink shadow-[0_0_0_3px_#161512,3px_4px_0_rgba(20,19,15,0.5)]"
              >
                <span className="text-[22px] font-bold italic tracking-[-1px] text-accent">
                  VS
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-[calc(14px+env(safe-area-inset-bottom))]">
          <button
            onClick={() => pick("neither")}
            disabled={!!picked}
            className="press flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-ink bg-card text-[16px] font-semibold text-ink shadow-pop disabled:opacity-60"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#161512"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 5l7 7-7 7" />
              <path d="M14 5l7 7-7 7" />
            </svg>
            Neither — skip both
          </button>
        </div>
      </div>
    </Frame>
  );
}

// ---- Sub-components ---------------------------------------------------------

function Starting({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <Logo size={52} wordmark={false} />
      {children}
    </div>
  );
}

function DuelCard({
  dish,
  anim,
  picked,
  onPick,
}: {
  dish: DishCard;
  anim: string;
  picked: boolean;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      className={`min-h-0 flex-1 basis-0 cursor-pointer text-left will-change-transform active:scale-[0.985] ${anim}`}
    >
      <div className="relative flex h-full overflow-hidden rounded-[22px] border-[3px] border-ink bg-card shadow-pop">
        <div className="stripes relative w-[48%] shrink-0 self-stretch border-r-[3px] border-ink">
          {dish.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dish.image_url}
              alt={dish.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col px-[15px] py-[14px]">
          <div className="line-clamp-2 text-[20px] font-bold leading-[1.05] text-ink">
            {dish.name}
          </div>
          <Restaurant name={dish.restaurantName} size={12.5} />
          {dish.description && (
            <p className="mt-[7px] line-clamp-2 font-[family-name:var(--font-body)] text-[12.5px] font-semibold leading-[1.35] text-muted">
              {dish.description}
            </p>
          )}
          <div className="mt-auto flex items-center justify-between gap-2 pt-[10px]">
            {dish.price != null ? <PricePill price={dish.price} /> : <span />}
            <div className="flex min-w-0 flex-nowrap justify-end gap-[5px]">
              {dish.delivery_apps.map((d) => (
                <DeliveryMark key={d.app} app={d.app} />
              ))}
            </div>
          </div>
        </div>
        {picked && (
          <div className="anim-stampIn absolute right-[14px] top-[14px] z-[4] rounded-[12px] border-[2.5px] border-ink bg-accent px-[13px] py-[6px] text-[15px] font-bold text-white shadow-hard">
            YUM! ✓
          </div>
        )}
      </div>
    </button>
  );
}

function Restaurant({ name, size }: { name: string; size: number }) {
  return (
    <div
      className="mt-[5px] flex items-center gap-[5px] font-semibold text-accent-dark"
      style={{ fontSize: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#5c9a30"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.2" />
      </svg>
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
        {name}
      </span>
    </div>
  );
}

function PricePill({ price }: { price: number }) {
  return (
    <span className="shrink-0 rounded-full border-[2.5px] border-ink bg-accent px-[11px] py-1 text-[14px] font-bold text-ink shadow-hard-sm">
      {price}
    </span>
  );
}

function DeliveryMark({ app }: { app: string }) {
  const b = brand(app);
  return (
    <span
      title={app}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[2.5px] border-ink text-[15px] font-bold leading-none shadow-[1.5px_1.5px_0_rgba(20,19,15,0.9)]"
      style={{ background: b.bg, color: b.fg }}
    >
      {b.short}
    </span>
  );
}
