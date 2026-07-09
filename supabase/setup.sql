-- ============================================================
-- What Should I Eat — one-shot setup for the Supabase SQL Editor
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It creates the schema (tables + RLS) and loads the demo catalog.
-- Run once on a fresh project. To re-seed later, run supabase/seed.sql alone
-- (re-running this whole file errors on "relation already exists", which just
-- means the schema is already in place).
-- ============================================================

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

-- ============================================================
-- Demo catalog seed
-- ============================================================
-- Demo catalog seed. Generated by scripts/gen-seed-sql.ts.
-- Safe to re-run: clears the catalog, then re-inserts.
begin;
delete from public.dishes;
delete from public.restaurants;

insert into public.restaurants (id, name, area) values
  ('8a0e960d-1c3d-4613-bd6d-d00acecc9612', 'Bombay Junction', 'Al Barsha'),
  ('507ba919-ec3d-4649-a267-0e1ca8bda6fb', 'Beirut Nights', 'Jumeirah'),
  ('6e1eb89f-bd76-43df-a530-9efa513b3f0e', 'Tokyo Slurp', 'Dubai Marina'),
  ('e6940cbd-8ea3-442e-9188-52165d9ad74a', 'Nonna''s Table', 'Downtown'),
  ('2cbdaa07-ca6a-4ad0-813e-96ab5cd61569', 'Smash Bros Burgers', 'JLT'),
  ('ec6205e0-e54d-45e4-8f9b-83eabd45fa6e', 'Bangkok Soi', 'Business Bay'),
  ('8aea6f92-fbe4-4956-81c0-3b6fea14df48', 'Casa Luchador', 'Dubai Marina'),
  ('f99a7b55-56e2-4efe-9281-af16e2b06b37', 'Dragon Wok', 'Deira'),
  ('a7b1c7d2-5ba6-48b2-8052-5a74b6d94bb7', 'Green Bowl Co.', 'Downtown'),
  ('3c6c164b-93f1-48a4-8e08-08ec34d1e079', 'Istanbul Grill House', 'Al Karama');

insert into public.dishes (restaurant_id, name, image_url, price, description, attributes, cuisine, main_protein, prep_style, is_veg, is_halal, allergens, delivery_apps) values
  ('8a0e960d-1c3d-4613-bd6d-d00acecc9612', 'Chicken Biryani', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=60', 38, 'Fragrant basmati layered with spiced chicken and fried onions.', '{"heaviness":0.8,"spiciness":0.7,"price_tier":0.4,"healthiness":0.35,"adventurousness":0.4,"warmth":0.9}'::jsonb, 'indian', 'chicken', 'steamed', false, true, '{}'::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/bombay-junction"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/bombay-junction"}]'::jsonb),
  ('8a0e960d-1c3d-4613-bd6d-d00acecc9612', 'Paneer Tikka Masala', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=60', 34, 'Charred paneer simmered in a creamy tomato gravy.', '{"heaviness":0.7,"spiciness":0.6,"price_tier":0.35,"healthiness":0.4,"adventurousness":0.35,"warmth":0.85}'::jsonb, 'indian', 'paneer', 'curry', true, true, ARRAY['dairy']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/bombay-junction"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/bombay-junction"}]'::jsonb),
  ('8a0e960d-1c3d-4613-bd6d-d00acecc9612', 'Masala Dosa', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=60', 22, 'Crisp rice crepe stuffed with spiced potato, served with sambar.', '{"heaviness":0.45,"spiciness":0.5,"price_tier":0.15,"healthiness":0.55,"adventurousness":0.45,"warmth":0.75}'::jsonb, 'indian', 'none', 'griddled', true, true, '{}'::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/bombay-junction"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/bombay-junction"}]'::jsonb),
  ('8a0e960d-1c3d-4613-bd6d-d00acecc9612', 'Butter Chicken', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=60', 42, 'Tandoori chicken folded into silky tomato-butter sauce.', '{"heaviness":0.8,"spiciness":0.45,"price_tier":0.45,"healthiness":0.3,"adventurousness":0.3,"warmth":0.9}'::jsonb, 'indian', 'chicken', 'curry', false, true, ARRAY['dairy']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/bombay-junction"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/bombay-junction"}]'::jsonb),
  ('507ba919-ec3d-4649-a267-0e1ca8bda6fb', 'Mixed Grill Platter', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=60', 65, 'Shish tawook, kofta and lamb kebab over saffron rice.', '{"heaviness":0.75,"spiciness":0.35,"price_tier":0.6,"healthiness":0.5,"adventurousness":0.3,"warmth":0.85}'::jsonb, 'lebanese', 'mixed', 'grilled', false, true, '{}'::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/beirut-nights"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/beirut-nights"}]'::jsonb),
  ('507ba919-ec3d-4649-a267-0e1ca8bda6fb', 'Falafel Wrap', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=60', 18, 'Crunchy falafel with tahini, pickles and fresh veg.', '{"heaviness":0.4,"spiciness":0.25,"price_tier":0.1,"healthiness":0.6,"adventurousness":0.25,"warmth":0.6}'::jsonb, 'lebanese', 'none', 'fried', true, true, ARRAY['sesame']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/beirut-nights"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/beirut-nights"}]'::jsonb),
  ('507ba919-ec3d-4649-a267-0e1ca8bda6fb', 'Fattoush & Grilled Halloumi', 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=800&q=60', 28, 'Zesty sumac salad with charred halloumi and crisp pita.', '{"heaviness":0.3,"spiciness":0.15,"price_tier":0.3,"healthiness":0.85,"adventurousness":0.3,"warmth":0.35}'::jsonb, 'lebanese', 'cheese', 'grilled', true, true, ARRAY['dairy', 'gluten']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/beirut-nights"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/beirut-nights"}]'::jsonb),
  ('507ba919-ec3d-4649-a267-0e1ca8bda6fb', 'Chicken Shawarma Plate', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=60', 32, 'Garlicky shawarma with fries, pickles and toum.', '{"heaviness":0.65,"spiciness":0.3,"price_tier":0.3,"healthiness":0.35,"adventurousness":0.2,"warmth":0.8}'::jsonb, 'lebanese', 'chicken', 'roasted', false, true, ARRAY['garlic']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/beirut-nights"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/beirut-nights"}]'::jsonb),
  ('6e1eb89f-bd76-43df-a530-9efa513b3f0e', 'Tonkotsu-Style Chicken Ramen', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=60', 48, 'Rich broth, springy noodles, ajitama egg and chashu chicken.', '{"heaviness":0.85,"spiciness":0.35,"price_tier":0.5,"healthiness":0.4,"adventurousness":0.55,"warmth":0.95}'::jsonb, 'japanese', 'chicken', 'simmered', false, true, ARRAY['egg', 'gluten', 'soy']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/tokyo-slurp"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/tokyo-slurp"}]'::jsonb),
  ('6e1eb89f-bd76-43df-a530-9efa513b3f0e', 'Salmon Avocado Roll', 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=800&q=60', 36, 'Eight pieces of fresh salmon and creamy avocado.', '{"heaviness":0.35,"spiciness":0.1,"price_tier":0.5,"healthiness":0.75,"adventurousness":0.6,"warmth":0.15}'::jsonb, 'japanese', 'fish', 'raw', false, true, ARRAY['fish', 'soy']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/tokyo-slurp"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/tokyo-slurp"}]'::jsonb),
  ('6e1eb89f-bd76-43df-a530-9efa513b3f0e', 'Chicken Katsu Curry', 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=60', 44, 'Panko-crisp chicken over Japanese curry and rice.', '{"heaviness":0.8,"spiciness":0.4,"price_tier":0.45,"healthiness":0.3,"adventurousness":0.5,"warmth":0.9}'::jsonb, 'japanese', 'chicken', 'fried', false, true, ARRAY['gluten', 'egg']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/tokyo-slurp"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/tokyo-slurp"}]'::jsonb),
  ('6e1eb89f-bd76-43df-a530-9efa513b3f0e', 'Veggie Yaki Udon', 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=60', 34, 'Thick udon stir-fried with shiitake, cabbage and sesame.', '{"heaviness":0.55,"spiciness":0.3,"price_tier":0.35,"healthiness":0.55,"adventurousness":0.5,"warmth":0.8}'::jsonb, 'japanese', 'none', 'stir-fried', true, true, ARRAY['gluten', 'soy', 'sesame']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/tokyo-slurp"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/tokyo-slurp"}]'::jsonb),
  ('e6940cbd-8ea3-442e-9188-52165d9ad74a', 'Margherita Pizza', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=60', 39, 'Wood-fired sourdough base, fior di latte, fresh basil.', '{"heaviness":0.6,"spiciness":0.05,"price_tier":0.4,"healthiness":0.4,"adventurousness":0.15,"warmth":0.8}'::jsonb, 'italian', 'cheese', 'baked', true, true, ARRAY['gluten', 'dairy']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/nonnas-table"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/nonnas-table"}]'::jsonb),
  ('e6940cbd-8ea3-442e-9188-52165d9ad74a', 'Beef Lasagna', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=60', 52, 'Slow-ragù lasagna with béchamel and parmesan crust.', '{"heaviness":0.9,"spiciness":0.1,"price_tier":0.55,"healthiness":0.25,"adventurousness":0.2,"warmth":0.9}'::jsonb, 'italian', 'beef', 'baked', false, true, ARRAY['gluten', 'dairy']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/nonnas-table"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/nonnas-table"}]'::jsonb),
  ('e6940cbd-8ea3-442e-9188-52165d9ad74a', 'Shrimp Linguine', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=60', 58, 'Garlic-chilli shrimp tossed with linguine and lemon.', '{"heaviness":0.6,"spiciness":0.35,"price_tier":0.6,"healthiness":0.5,"adventurousness":0.45,"warmth":0.75}'::jsonb, 'italian', 'shrimp', 'sautéed', false, true, ARRAY['gluten', 'shellfish', 'garlic']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/nonnas-table"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/nonnas-table"}]'::jsonb),
  ('e6940cbd-8ea3-442e-9188-52165d9ad74a', 'Burrata Caprese', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=60', 45, 'Creamy burrata, heirloom tomatoes, basil oil.', '{"heaviness":0.3,"spiciness":0,"price_tier":0.55,"healthiness":0.7,"adventurousness":0.3,"warmth":0.2}'::jsonb, 'italian', 'cheese', 'fresh', true, true, ARRAY['dairy']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/nonnas-table"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/nonnas-table"}]'::jsonb),
  ('2cbdaa07-ca6a-4ad0-813e-96ab5cd61569', 'Double Smash Burger', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=60', 35, 'Two crispy-edged patties, American cheese, house sauce.', '{"heaviness":0.95,"spiciness":0.15,"price_tier":0.35,"healthiness":0.1,"adventurousness":0.1,"warmth":0.85}'::jsonb, 'american', 'beef', 'griddled', false, true, ARRAY['gluten', 'dairy']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/smash-bros"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/smash-bros"}]'::jsonb),
  ('2cbdaa07-ca6a-4ad0-813e-96ab5cd61569', 'Nashville Hot Chicken Sandwich', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=60', 33, 'Fiery fried chicken, slaw and pickles on a potato bun.', '{"heaviness":0.85,"spiciness":0.85,"price_tier":0.35,"healthiness":0.15,"adventurousness":0.4,"warmth":0.85}'::jsonb, 'american', 'chicken', 'fried', false, true, ARRAY['gluten', 'egg']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/smash-bros"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/smash-bros"}]'::jsonb),
  ('2cbdaa07-ca6a-4ad0-813e-96ab5cd61569', 'Loaded Fries', 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=800&q=60', 22, 'Skin-on fries under cheese sauce, jalapeños and scallions.', '{"heaviness":0.8,"spiciness":0.4,"price_tier":0.15,"healthiness":0.05,"adventurousness":0.15,"warmth":0.8}'::jsonb, 'american', 'none', 'fried', true, true, ARRAY['dairy']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/smash-bros"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/smash-bros"}]'::jsonb),
  ('2cbdaa07-ca6a-4ad0-813e-96ab5cd61569', 'Grilled Chicken Caesar', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=60', 30, 'Char-grilled chicken over crisp romaine and parmesan.', '{"heaviness":0.45,"spiciness":0.05,"price_tier":0.3,"healthiness":0.65,"adventurousness":0.1,"warmth":0.4}'::jsonb, 'american', 'chicken', 'grilled', false, true, ARRAY['dairy', 'egg', 'fish', 'gluten']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/smash-bros"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/smash-bros"}]'::jsonb),
  ('ec6205e0-e54d-45e4-8f9b-83eabd45fa6e', 'Pad Thai with Shrimp', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=60', 40, 'Tamarind-glossed rice noodles, shrimp, peanuts, lime.', '{"heaviness":0.6,"spiciness":0.45,"price_tier":0.4,"healthiness":0.45,"adventurousness":0.5,"warmth":0.75}'::jsonb, 'thai', 'shrimp', 'stir-fried', false, true, ARRAY['shellfish', 'peanut', 'egg', 'soy']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/bangkok-soi"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/bangkok-soi"}]'::jsonb),
  ('ec6205e0-e54d-45e4-8f9b-83eabd45fa6e', 'Green Curry Chicken', 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=800&q=60', 42, 'Coconut green curry with Thai basil and jasmine rice.', '{"heaviness":0.65,"spiciness":0.75,"price_tier":0.4,"healthiness":0.45,"adventurousness":0.55,"warmth":0.9}'::jsonb, 'thai', 'chicken', 'curry', false, true, '{}'::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/bangkok-soi"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/bangkok-soi"}]'::jsonb),
  ('ec6205e0-e54d-45e4-8f9b-83eabd45fa6e', 'Som Tam Papaya Salad', 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=60', 26, 'Green papaya pounded with chilli, lime and peanuts.', '{"heaviness":0.2,"spiciness":0.85,"price_tier":0.2,"healthiness":0.8,"adventurousness":0.7,"warmth":0.2}'::jsonb, 'thai', 'none', 'fresh', true, true, ARRAY['peanut']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/bangkok-soi"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/bangkok-soi"}]'::jsonb),
  ('ec6205e0-e54d-45e4-8f9b-83eabd45fa6e', 'Tofu Massaman Curry', 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=60', 36, 'Mellow peanut-coconut curry with potatoes and tofu.', '{"heaviness":0.6,"spiciness":0.35,"price_tier":0.35,"healthiness":0.5,"adventurousness":0.5,"warmth":0.9}'::jsonb, 'thai', 'tofu', 'curry', true, true, ARRAY['peanut', 'soy']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/bangkok-soi"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/bangkok-soi"}]'::jsonb),
  ('8aea6f92-fbe4-4956-81c0-3b6fea14df48', 'Birria Tacos', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=60', 44, 'Slow-braised beef tacos with consommé for dipping.', '{"heaviness":0.8,"spiciness":0.55,"price_tier":0.45,"healthiness":0.3,"adventurousness":0.65,"warmth":0.9}'::jsonb, 'mexican', 'beef', 'braised', false, true, ARRAY['gluten']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/casa-luchador"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/casa-luchador"}]'::jsonb),
  ('8aea6f92-fbe4-4956-81c0-3b6fea14df48', 'Chicken Quesadilla', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=60', 32, 'Toasted tortilla packed with chicken and oaxaca cheese.', '{"heaviness":0.7,"spiciness":0.3,"price_tier":0.3,"healthiness":0.25,"adventurousness":0.25,"warmth":0.8}'::jsonb, 'mexican', 'chicken', 'griddled', false, true, ARRAY['gluten', 'dairy']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/casa-luchador"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/casa-luchador"}]'::jsonb),
  ('8aea6f92-fbe4-4956-81c0-3b6fea14df48', 'Veggie Burrito Bowl', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=60', 34, 'Cilantro rice, black beans, guac, pico and crema.', '{"heaviness":0.5,"spiciness":0.35,"price_tier":0.35,"healthiness":0.7,"adventurousness":0.35,"warmth":0.5}'::jsonb, 'mexican', 'none', 'assembled', true, true, ARRAY['dairy']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/casa-luchador"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/casa-luchador"}]'::jsonb),
  ('8aea6f92-fbe4-4956-81c0-3b6fea14df48', 'Shrimp Aguachile', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=60', 48, 'Citrus-cured shrimp in a bright serrano-lime bath.', '{"heaviness":0.25,"spiciness":0.8,"price_tier":0.55,"healthiness":0.75,"adventurousness":0.9,"warmth":0.1}'::jsonb, 'mexican', 'shrimp', 'raw', false, true, ARRAY['shellfish']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/casa-luchador"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/casa-luchador"}]'::jsonb),
  ('f99a7b55-56e2-4efe-9281-af16e2b06b37', 'Kung Pao Chicken', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=60', 38, 'Wok-seared chicken, dried chillies and roasted peanuts.', '{"heaviness":0.65,"spiciness":0.7,"price_tier":0.35,"healthiness":0.4,"adventurousness":0.5,"warmth":0.8}'::jsonb, 'chinese', 'chicken', 'stir-fried', false, true, ARRAY['peanut', 'soy']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/dragon-wok"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/dragon-wok"}]'::jsonb),
  ('f99a7b55-56e2-4efe-9281-af16e2b06b37', 'Veg Dim Sum Basket', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=60', 28, 'Steamed dumplings: bok choy, mushroom, glass noodle.', '{"heaviness":0.35,"spiciness":0.15,"price_tier":0.3,"healthiness":0.6,"adventurousness":0.55,"warmth":0.7}'::jsonb, 'chinese', 'none', 'steamed', true, true, ARRAY['gluten', 'soy']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/dragon-wok"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/dragon-wok"}]'::jsonb),
  ('f99a7b55-56e2-4efe-9281-af16e2b06b37', 'Beef & Broccoli', 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=800&q=60', 42, 'Tender beef in glossy oyster-style sauce over rice.', '{"heaviness":0.7,"spiciness":0.2,"price_tier":0.4,"healthiness":0.45,"adventurousness":0.3,"warmth":0.8}'::jsonb, 'chinese', 'beef', 'stir-fried', false, true, ARRAY['soy', 'gluten']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/dragon-wok"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/dragon-wok"}]'::jsonb),
  ('f99a7b55-56e2-4efe-9281-af16e2b06b37', 'Sichuan Mapo Tofu', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=60', 32, 'Silken tofu in numbing-spicy chilli bean sauce.', '{"heaviness":0.55,"spiciness":0.9,"price_tier":0.3,"healthiness":0.5,"adventurousness":0.8,"warmth":0.85}'::jsonb, 'chinese', 'tofu', 'braised', true, true, ARRAY['soy']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/dragon-wok"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/dragon-wok"}]'::jsonb),
  ('a7b1c7d2-5ba6-48b2-8052-5a74b6d94bb7', 'Salmon Poke Bowl', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=60', 52, 'Sushi rice, marinated salmon, edamame, avocado, furikake.', '{"heaviness":0.4,"spiciness":0.2,"price_tier":0.6,"healthiness":0.85,"adventurousness":0.55,"warmth":0.2}'::jsonb, 'hawaiian', 'fish', 'raw', false, true, ARRAY['fish', 'soy', 'sesame']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/green-bowl-co"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/green-bowl-co"}]'::jsonb),
  ('a7b1c7d2-5ba6-48b2-8052-5a74b6d94bb7', 'Harissa Chicken Grain Bowl', 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=800&q=60', 42, 'Freekeh, charred chicken, harissa yoghurt, herbs.', '{"heaviness":0.45,"spiciness":0.5,"price_tier":0.45,"healthiness":0.85,"adventurousness":0.5,"warmth":0.55}'::jsonb, 'fusion', 'chicken', 'grilled', false, true, ARRAY['gluten', 'dairy']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/green-bowl-co"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/green-bowl-co"}]'::jsonb),
  ('a7b1c7d2-5ba6-48b2-8052-5a74b6d94bb7', 'Acai Energy Bowl', 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=60', 36, 'Acai blend topped with granola, banana and coconut.', '{"heaviness":0.2,"spiciness":0,"price_tier":0.4,"healthiness":0.8,"adventurousness":0.4,"warmth":0.05}'::jsonb, 'healthy', 'none', 'fresh', true, true, ARRAY['nuts', 'gluten']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/green-bowl-co"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/green-bowl-co"}]'::jsonb),
  ('a7b1c7d2-5ba6-48b2-8052-5a74b6d94bb7', 'Roast Veg & Quinoa Salad', 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=60', 38, 'Roast pumpkin, quinoa, pomegranate, tahini drizzle.', '{"heaviness":0.3,"spiciness":0.1,"price_tier":0.4,"healthiness":0.9,"adventurousness":0.35,"warmth":0.4}'::jsonb, 'healthy', 'none', 'roasted', true, true, ARRAY['sesame']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/green-bowl-co"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/green-bowl-co"}]'::jsonb),
  ('3c6c164b-93f1-48a4-8e08-08ec34d1e079', 'Adana Kebab Plate', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=60', 46, 'Hand-minced spiced lamb kebab with bulgur and ezme.', '{"heaviness":0.75,"spiciness":0.55,"price_tier":0.45,"healthiness":0.45,"adventurousness":0.4,"warmth":0.85}'::jsonb, 'turkish', 'lamb', 'grilled', false, true, ARRAY['gluten']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/istanbul-grill"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/istanbul-grill"}]'::jsonb),
  ('3c6c164b-93f1-48a4-8e08-08ec34d1e079', 'Cheese Pide', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=60', 30, 'Boat-shaped flatbread with molten kashkaval and egg.', '{"heaviness":0.7,"spiciness":0.05,"price_tier":0.25,"healthiness":0.25,"adventurousness":0.3,"warmth":0.85}'::jsonb, 'turkish', 'cheese', 'baked', true, true, ARRAY['gluten', 'dairy', 'egg']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/istanbul-grill"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/istanbul-grill"}]'::jsonb),
  ('3c6c164b-93f1-48a4-8e08-08ec34d1e079', 'Iskender Kebab', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=60', 54, 'Sliced döner over pide bread, tomato butter, yoghurt.', '{"heaviness":0.9,"spiciness":0.3,"price_tier":0.55,"healthiness":0.25,"adventurousness":0.45,"warmth":0.9}'::jsonb, 'turkish', 'beef', 'roasted', false, true, ARRAY['gluten', 'dairy']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/istanbul-grill"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/istanbul-grill"}]'::jsonb),
  ('3c6c164b-93f1-48a4-8e08-08ec34d1e079', 'Lentil Soup & Simit', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=60', 20, 'Silky red lentil soup with lemon and a sesame simit.', '{"heaviness":0.35,"spiciness":0.15,"price_tier":0.1,"healthiness":0.75,"adventurousness":0.2,"warmth":0.95}'::jsonb, 'turkish', 'none', 'simmered', true, true, ARRAY['gluten', 'sesame']::text[], '[{"app":"talabat","url":"https://www.talabat.com/uae/istanbul-grill"},{"app":"deliveroo","url":"https://deliveroo.ae/menu/dubai/istanbul-grill"}]'::jsonb);

commit;
