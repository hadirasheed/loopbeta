import Link from "next/link";

/** Page title row with optional description and right-aligned actions. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-[family-name:var(--font-sans)] text-2xl font-bold tracking-tight text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-ink/50">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** White surface card. */
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-black/10 bg-white ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="text-xs font-semibold uppercase tracking-wide text-ink/40">
        {label}
      </div>
      <div className="mt-1 font-[family-name:var(--font-sans)] text-3xl font-bold text-ink">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-ink/45">{hint}</div>}
    </>
  );
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5">
      {href ? (
        <Link href={href} className="block hover:opacity-80">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  );
}

/** Primary / secondary button styles, shared across admin pages. */
export const btnPrimary =
  "inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50";
export const btnAccent =
  "inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-95 disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center gap-2 rounded-lg border border-black/15 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-black/[0.03] disabled:opacity-50";
export const inputCls =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-ink/40";
