@AGENTS.md

# What Should I Eat — conventions

A food-decision web app: "this or that" duels teach a per-user taste model,
and the session ends in one committed recommendation. Full product spec lives
in `SPEC.md`.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS, deployed to Vercel.
- Supabase: Postgres, Auth (Google OAuth only), RLS.
- The recommendation algorithm lives in Next.js API routes — no separate
  service.

## Layout

- `src/app/` — routes. API routes under `src/app/api/`.
- `src/lib/` — shared code. `types.ts` holds domain types and the canonical
  `ATTRIBUTE_KEYS` list (the 6 numeric model attributes).
- `supabase/migrations/` — SQL migrations; the schema of record.
- `scripts/seed.ts` — demo data only (`npm run seed`); the admin dashboard at
  `/admin` is the real catalog-entry path.

## Conventions

- All model state (taste weights, sessions, duels) is server-side in
  Postgres. The client only renders cards and reports taps.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only; never give it a `NEXT_PUBLIC_`
  prefix and never import it into client components. Catalog writes go
  through admin-only API routes that check the caller's email against
  `ADMIN_EMAILS` server-side.
- Per-user tables are RLS-scoped to `auth.uid()`; `duels` is append-only
  (no update/delete policies).
- Dish images are external URLs rendered with plain `<img>` — do not proxy
  image bytes through Supabase Storage or next/image optimization.
- Attribute values and taste weights are keyed by `ATTRIBUTE_KEYS`; add new
  attributes there first, then migrate `dishes.attributes` /
  `user_taste.weights`.
- Mobile-first, card-based UI; one decision on screen at a time.

## Commands

- `npm run dev` — dev server; `npm run build` — production build + typecheck.
- `npm run lint` — ESLint.
- `npm run seed` — seed demo catalog (needs `.env.local`; `-- --force` wipes
  and re-seeds).
