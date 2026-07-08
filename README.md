# What Should I Eat

A mobile-first web app that helps you decide what to eat. It shows
"this or that" duels — two food cards, pick one — learns your taste from each
pick (Bradley–Terry updates with Thompson-sampling exploration), and after a
handful of rounds commits to a single recommendation with order links.

Stack: Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres,
Auth, RLS), deployed to Vercel. See `SPEC.md` for the full product spec and
`CLAUDE.md` for code conventions.

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
   (free tier is fine).
2. In **Project Settings → API**, note the Project URL, `anon` key, and
   `service_role` key.

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in all values (see comments in the file). The service-role key is
server-only — it must **not** get a `NEXT_PUBLIC_` prefix.

### 3. Apply the database schema

Using the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase db push
```

(Alternatively, paste `supabase/migrations/*.sql` into the SQL editor in the
Supabase dashboard.)

### 4. Seed demo data

```bash
npm install
npm run seed              # ~10 restaurants, ~36 dishes
npm run seed -- --force   # wipe catalog and re-seed
```

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000.

## Google OAuth (Phase 1)

In the Supabase dashboard: **Authentication → Providers → Google**, enable it
and supply a Google OAuth client ID/secret (created in Google Cloud Console
with the Supabase callback URL). Add your local and production URLs under
**Authentication → URL Configuration**.

## Deploying to Vercel

```bash
npx vercel login
npx vercel link
```

Set these environment variables in the Vercel project (Settings →
Environment Variables):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; **no `NEXT_PUBLIC_` prefix**
- `ADMIN_EMAILS` — comma-separated admin allowlist for `/admin`
- `NEXT_PUBLIC_SITE_URL` — the production URL

## Project structure

- `src/app/` — routes and API endpoints
- `src/lib/` — shared domain types and helpers
- `supabase/migrations/` — schema of record
- `scripts/seed.ts` — demo catalog data (admin dashboard is the real entry
  path)
