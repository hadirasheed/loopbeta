-- User profiles: the display name captured on first sign-up.
-- Additive; does not touch existing tables.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users read own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = user_id);
create policy "users insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = user_id);
create policy "users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
