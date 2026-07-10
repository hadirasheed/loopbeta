"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

function icon(path: React.ReactNode) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {path}
    </svg>
  );
}

export default function AdminNav({
  email,
  draftCount,
}: {
  email: string;
  draftCount: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items: NavItem[] = [
    {
      href: "/admin",
      label: "Overview",
      icon: icon(
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </>
      ),
    },
    {
      href: "/admin/dishes",
      label: "Dishes",
      icon: icon(
        <>
          <path d="M3 11h18" />
          <path d="M12 3a7 7 0 0 1 7 7v1H5v-1a7 7 0 0 1 7-7z" />
          <path d="M5 15h14l-1 5H6z" />
        </>
      ),
    },
    {
      href: "/admin/restaurants",
      label: "Restaurants",
      icon: icon(
        <>
          <path d="M4 3v7a2 2 0 0 0 2 2v9" />
          <path d="M4 3v4M7 3v4M10 3v4a3 3 0 0 1-3 3" />
          <path d="M18 3c-1.5 0-3 2-3 6s1.2 4 3 4v8" />
        </>
      ),
    },
    {
      href: "/admin/review",
      label: "Review drafts",
      badge: draftCount,
      icon: icon(
        <>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </>
      ),
    },
    {
      href: "/admin/import",
      label: "Import",
      icon: icon(
        <>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M7 10l5 5 5-5" />
          <path d="M12 15V3" />
        </>
      ),
    },
    {
      href: "/admin/ai-settings",
      label: "AI settings",
      icon: icon(
        <>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
          <circle cx="12" cy="12" r="3.5" />
        </>
      ),
    },
  ];

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {items.map((it) => {
        const active = isActive(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-accent/15 text-ink"
                : "text-ink/60 hover:bg-black/[0.04] hover:text-ink"
            }`}
          >
            <span className={active ? "text-accent-dark" : "text-ink/40"}>
              {it.icon}
            </span>
            <span className="flex-1">{it.label}</span>
            {it.badge ? (
              <span className="rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white">
                {it.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2 px-5 py-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border-[2.5px] border-ink bg-accent text-sm">
        🍽️
      </span>
      <span className="text-[15px] font-bold tracking-tight text-ink">
        Loop admin
      </span>
    </div>
  );

  const footer = (
    <div className="mt-auto border-t border-black/10 px-5 py-4">
      <p className="truncate text-xs text-ink/40">{email}</p>
      <Link
        href="/"
        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-ink/60 hover:text-ink"
      >
        ← Exit to app
      </Link>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-black/10 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border-[2.5px] border-ink bg-accent text-xs">
            🍽️
          </span>
          <span className="text-sm font-bold text-ink">Loop admin</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Menu"
          className="rounded-lg border border-black/15 p-1.5"
        >
          {icon(
            <>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </>
          )}
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-black/10 bg-white md:flex">
        {brand}
        {nav}
        {footer}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-ink/40" />
          <div
            className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {brand}
            {nav}
            {footer}
          </div>
        </div>
      )}
    </>
  );
}
