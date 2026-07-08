-- What Should I Eat — initial schema
-- Supabase Auth provides auth.users; all user_id columns reference it.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area text,
  created_at timestamptz not null default now()
);

create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  image_url text,
  price numeric,
  description text,
  -- numeric model attributes, each normalized 0..1:
  -- {heaviness, spiciness, price_tier, healthiness, adventurousness, warmth}
  attributes jsonb not null default '{}'::jsonb,
  -- categorical tags used for filtering + pairing diversity, not scored in v1:
  cuisine text,
  main_protein text,
  prep_style text,
  -- dietary flags matched against user_constraints hard filters:
  is_veg boolean not null default false,
  is_halal boolean not null default true,
  allergens text[] not null default '{}',
  -- [{app: "talabat", url: "..."}] — informational only
  delivery_apps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index dishes_restaurant_id_idx on public.dishes (restaurant_id);

create table public.user_constraints (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_veg boolean not null default false,
  is_halal boolean not null default false,
  allergens text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- weights: {"heaviness": {"mean": 0, "var": 1}, ...} one entry per numeric attribute
create table public.user_taste (
  user_id uuid primary key references auth.users (id) on delete cascade,
  weights jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  committed_dish_id uuid references public.dishes (id) on delete set null,
  mood text check (mood in ('starving', 'peckish', 'browsing'))
);

create index sessions_user_id_idx on public.sessions (user_id);

-- Append-only event log; this is the core data asset.
create table public.duels (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  dish_a uuid not null references public.dishes (id) on delete cascade,
  dish_b uuid not null references public.dishes (id) on delete cascade,
  winner text not null check (winner in ('a', 'b', 'neither')),
  -- {daypart, weekday, mood}
  context jsonb not null default '{}'::jsonb,
  round_index int not null,
  created_at timestamptz not null default now()
);

create index duels_session_id_idx on public.duels (session_id);
create index duels_user_id_idx on public.duels (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Catalog tables (restaurants, dishes) are readable by any signed-in user;
-- writes only happen through admin API routes using the service-role key,
-- which bypasses RLS — so no insert/update/delete policies here.
--
-- Per-user tables are scoped to auth.uid(). duels is append-only: no
-- update/delete policies on purpose.
-- ---------------------------------------------------------------------------

alter table public.restaurants enable row level security;
alter table public.dishes enable row level security;
alter table public.user_constraints enable row level security;
alter table public.user_taste enable row level security;
alter table public.sessions enable row level security;
alter table public.duels enable row level security;

create policy "restaurants are readable by signed-in users"
  on public.restaurants for select to authenticated using (true);

create policy "dishes are readable by signed-in users"
  on public.dishes for select to authenticated using (true);

create policy "users read own constraints"
  on public.user_constraints for select to authenticated
  using (auth.uid() = user_id);
create policy "users insert own constraints"
  on public.user_constraints for insert to authenticated
  with check (auth.uid() = user_id);
create policy "users update own constraints"
  on public.user_constraints for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users read own taste"
  on public.user_taste for select to authenticated
  using (auth.uid() = user_id);
create policy "users insert own taste"
  on public.user_taste for insert to authenticated
  with check (auth.uid() = user_id);
create policy "users update own taste"
  on public.user_taste for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users read own sessions"
  on public.sessions for select to authenticated
  using (auth.uid() = user_id);
create policy "users insert own sessions"
  on public.sessions for insert to authenticated
  with check (auth.uid() = user_id);
create policy "users update own sessions"
  on public.sessions for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users read own duels"
  on public.duels for select to authenticated
  using (auth.uid() = user_id);
create policy "users append own duels"
  on public.duels for insert to authenticated
  with check (auth.uid() = user_id);
