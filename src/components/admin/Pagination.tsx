"use client";

import { useState } from "react";

export interface PageState<T> {
  page: number;
  setPage: (p: number) => void;
  pageCount: number;
  pageItems: T[];
  total: number;
  from: number;
  to: number;
  pageSize: number;
}

/**
 * Client-side pagination over an in-memory list. `page` is clamped to the
 * valid range on every render, so shrinking the source list (e.g. after a
 * filter change or a delete) never leaves the view stranded on an empty page.
 */
export function usePagination<T>(items: T[], pageSize = 20): PageState<T> {
  const [rawPage, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, rawPage), pageCount);
  const start = (page - 1) * pageSize;
  return {
    page,
    setPage,
    pageCount,
    pageItems: items.slice(start, start + pageSize),
    total: items.length,
    from: items.length === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, items.length),
    pageSize,
  };
}

/** Compact windowed list of page numbers with ellipses, e.g. 1 … 4 5 6 … 20. */
function pageWindow(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const out: (number | "…")[] = [1];
  const lo = Math.max(2, page - 1);
  const hi = Math.min(pageCount - 1, page + 1);
  if (lo > 2) out.push("…");
  for (let p = lo; p <= hi; p++) out.push(p);
  if (hi < pageCount - 1) out.push("…");
  out.push(pageCount);
  return out;
}

/**
 * Pagination bar: a "showing X–Y of Z" summary plus prev / numbered / next
 * controls. Renders nothing when everything fits on a single page.
 */
export function Pagination<T>({
  state,
  unit = "items",
}: {
  state: PageState<T>;
  unit?: string;
}) {
  const { page, setPage, pageCount, total, from, to } = state;
  if (pageCount <= 1) return null;

  const btn =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-black/15 bg-white px-2 text-sm text-ink transition hover:bg-black/[0.03] disabled:opacity-40 disabled:hover:bg-white";

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs text-ink/50">
        Showing {from}–{to} of {total} {unit}
      </span>
      <div className="flex items-center gap-1">
        <button
          className={btn}
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          aria-label="Previous page"
        >
          ‹
        </button>
        {pageWindow(page, pageCount).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-sm text-ink/40">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => setPage(p)}
              aria-current={p === page ? "page" : undefined}
              className={`${btn} ${
                p === page ? "border-ink bg-ink text-white hover:bg-ink" : ""
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          className={btn}
          disabled={page >= pageCount}
          onClick={() => setPage(page + 1)}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}
