"use client";

import { Fragment, useMemo, useState } from "react";
import type { AttributeKey } from "@/lib/types";
import { inputCls } from "@/components/admin/ui";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  joined: string;
  lastUsed: string;
  lastUsedIso: string | null;
  sessions: number;
  isVeg: boolean;
  isHalal: boolean;
  hasPrefs: boolean;
  allergens: string[];
  learnedPct: number;
  means: { key: AttributeKey; mean: number }[];
}

const ATTR_LABEL: Record<AttributeKey, string> = {
  heaviness: "Heaviness",
  spiciness: "Spiciness",
  price_tier: "Price tier",
  healthiness: "Healthiness",
  adventurousness: "Adventurousness",
  warmth: "Warmth",
};

type Sort = "recent" | "uses" | "name" | "learned";

export default function UsersTable({ rows }: { rows: UserRow[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = rows.filter(
      (r) =>
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
    );
    out.sort((a, b) => {
      switch (sort) {
        case "uses":
          return b.sessions - a.sessions;
        case "name":
          return (a.name || a.email).localeCompare(b.name || b.email);
        case "learned":
          return b.learnedPct - a.learnedPct;
        default:
          return (b.lastUsedIso ?? "").localeCompare(a.lastUsedIso ?? "");
      }
    });
    return out;
  }, [rows, query, sort]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className={`${inputCls} max-w-xs`}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink/40"
        >
          <option value="recent">Most recent</option>
          <option value="uses">Most uses</option>
          <option value="learned">Most learned</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase tracking-wide text-ink/40">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Uses</th>
              <th className="p-3">Last used</th>
              <th className="p-3">Taste learned</th>
              <th className="p-3">Joined</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-ink/40">
                  No users.
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const expanded = open === u.id;
                return (
                  <Fragment key={u.id}>
                    <tr
                      className="cursor-pointer border-b border-black/5 last:border-0 hover:bg-black/[0.015]"
                      onClick={() => setOpen(expanded ? null : u.id)}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-accent text-xs font-bold text-ink">
                            {(u.name || u.email || "?")
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium text-ink">
                              {u.name || (
                                <span className="text-ink/40">No name</span>
                              )}
                            </div>
                            <div className="truncate text-xs text-ink/45">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 tabular-nums text-ink/70">
                        {u.sessions}
                      </td>
                      <td className="p-3 text-ink/60">{u.lastUsed}</td>
                      <td className="p-3">
                        <LearnedMeter pct={u.learnedPct} />
                      </td>
                      <td className="p-3 text-ink/50">{u.joined}</td>
                      <td className="p-3 text-right text-ink/40">
                        {expanded ? "▲" : "▼"}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-black/5 bg-black/[0.015]">
                        <td colSpan={6} className="p-5">
                          <div className="grid gap-6 md:grid-cols-2">
                            <div>
                              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
                                Preferences
                              </h3>
                              {u.hasPrefs ? (
                                <div className="flex flex-wrap gap-1.5">
                                  <Tag on={u.isVeg} label="Vegetarian" />
                                  <Tag on={u.isHalal} label="Halal only" />
                                  {u.allergens.length > 0 ? (
                                    u.allergens.map((a) => (
                                      <span
                                        key={a}
                                        className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium capitalize text-red-600"
                                      >
                                        no {a}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-ink/40">
                                      No allergens
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-ink/40">
                                  Onboarding not completed.
                                </p>
                              )}
                            </div>

                            <div>
                              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
                                Learned taste ({u.learnedPct}% confident)
                              </h3>
                              <div className="flex flex-col gap-1.5">
                                {u.means.map((m) => (
                                  <TasteBar
                                    key={m.key}
                                    label={ATTR_LABEL[m.key]}
                                    mean={m.mean}
                                  />
                                ))}
                              </div>
                              <p className="mt-2 text-[11px] text-ink/40">
                                Bars lean right when the user prefers more of an
                                attribute, left when they prefer less.
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LearnedMeter({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-ink/50">{pct}%</span>
    </div>
  );
}

function Tag({ on, label }: { on: boolean; label: string }) {
  return on ? (
    <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-700">
      {label}
    </span>
  ) : (
    <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-ink/40 line-through">
      {label}
    </span>
  );
}

function TasteBar({ label, mean }: { label: string; mean: number }) {
  // Clamp the learned mean to [-1, 1] for display.
  const m = Math.min(1, Math.max(-1, mean));
  const pct = Math.abs(m) * 50; // half-width
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 shrink-0 text-ink/60">{label}</span>
      <div className="relative h-2 flex-1 rounded-full bg-black/10">
        <div className="absolute left-1/2 top-0 h-full w-px bg-black/20" />
        <div
          className={`absolute top-0 h-full rounded-full ${
            m >= 0 ? "bg-accent" : "bg-amber-500"
          }`}
          style={
            m >= 0
              ? { left: "50%", width: `${pct}%` }
              : { right: "50%", width: `${pct}%` }
          }
        />
      </div>
      <span className="w-10 text-right tabular-nums text-ink/40">
        {m >= 0 ? "+" : ""}
        {m.toFixed(2)}
      </span>
    </div>
  );
}
