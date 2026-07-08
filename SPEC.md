# "What Should I Eat" — MVP spec

## What we're building

A web app that helps someone decide what to eat by showing "this or that"
duels — two food cards, pick one. Each pick teaches the app the user's taste,
and after a handful of duels it commits to one recommendation. The whole
point is to end in a decision, not to be an endless scroll feed.

## Stack (keep it cost-effective, all free tiers)

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase for Postgres, Auth, and (optionally) Storage
- The recommendation algorithm runs as Next.js API routes (one repo, deploy
  to Vercel — do not spin up a separate service)
- Deploy target: Vercel
- Mobile-first, clean, card-based UI — one decision on screen at a time

## Auth

- Supabase Auth with Google OAuth only for v1. (Phone OTP is out of scope.)
- New users go to onboarding after their first login.

## User-facing screens (3)

1. **Onboarding / cold start** — capture hard constraints (vegetarian,
   halal, allergens) which are permanent filters, plus a couple of taste
   interests. Keep it to one short screen.
2. **Duel screen** — two food cards side by side, each showing: image, dish
   name, restaurant name, price, one-line description, and delivery-app
   logos. User taps a card to pick, or taps "Neither." At session start, one
   optional one-tap mood control ("Starving / Peckish / Just browsing").
3. **Result screen** — a single hero pick with "Order on [app]" links, plus
   one backup option.

## Admin dashboard (catalog management)

A separate, access-gated area (e.g. at `/admin`) where the owner adds and
edits the food catalog. This is how the menu gets populated — not by editing
the database by hand.

- **Access control:** gate it to an allowlist of admin emails from an env
  var (`ADMIN_EMAILS`). Enforce the check server-side on every write
  endpoint, not just by hiding the UI — the dish-write API must reject
  non-admins outright.
- **Add / edit dish form:** name, restaurant (pick existing or create new),
  image URL, price, one-line description; the 6 numeric attributes as 0–1
  sliders (heaviness, spiciness, price_tier, healthiness, adventurousness,
  warmth) so tagging stays fast and consistent; categorical tags (cuisine,
  main_protein, prep_style); and a repeatable "delivery app + order URL"
  field.
- **List view:** all dishes with search/filter, plus edit and delete.
- **Restaurant management:** add / edit restaurants (name, area).

Writes go through admin-only API routes into the same `dishes` /
`restaurants` tables the duel engine reads. The seed script from Phase 0 is
just for instant demo data; the dashboard is the real, ongoing way to enter
menus.

## Database schema

```sql
-- Supabase auth provides auth.users; reference it by id.

user_constraints(user_id uuid pk, is_veg bool, is_halal bool, allergens text[])

restaurants(id uuid pk, name text, area text)

dishes(
  id uuid pk,
  restaurant_id uuid references restaurants,
  name text, image_url text, price numeric, description text,
  -- numeric model attributes, each normalized 0..1:
  attributes jsonb,   -- {heaviness, spiciness, price_tier, healthiness, adventurousness, warmth}
  -- categorical tags used for filtering + pairing diversity, not scored directly in v1:
  cuisine text, main_protein text, prep_style text,
  delivery_apps jsonb -- [{app:"talabat", url:"..."}]  (informational only)
)

user_taste(user_id uuid pk, weights jsonb, updated_at timestamptz)
-- weights: {"heaviness":{"mean":0,"var":1}, ...one entry per numeric attribute}

sessions(id uuid pk, user_id uuid, started_at timestamptz,
         committed_dish_id uuid, mood text)

duels(   -- append-only event log; this is the core data asset
  id uuid pk, session_id uuid, user_id uuid,
  dish_a uuid, dish_b uuid, winner text,   -- 'a' | 'b' | 'neither'
  context jsonb,      -- {daypart, weekday, mood}
  round_index int, created_at timestamptz
)
```

Serve dish images from external URLs (do not push image bytes through
Supabase — it burns egress). Store only the URL.

> Implementation note: the actual migration additionally puts
> `is_veg` / `is_halal` / `allergens` columns on `dishes` — without
> dish-side dietary data the hard-constraint filter in `/api/next-pair`
> has nothing to match against.

## Algorithm

Content-based model with per-user weights, updated online via
Bradley–Terry, with Thompson sampling for exploration.

- **Scoring:** `score(dish) = Σ attributes[k] * weights[k].mean` over the 6
  numeric attributes.
- **Thompson sampling:** before scoring for a request, sample each weight
  `w[k] ~ Normal(mean[k], var[k])` and score with the sampled weights (this
  gives built-in exploration).
- **Cold start:** a new `user_taste` row is `mean = 0, var = 1` for every
  attribute (maximum exploration). No special-case code needed.
- **Pairing:**
  - First 2–3 duels of a session = appetite probes: pick two eligible dishes
    that are close on all attributes except one, where they're far apart
    (probe heaviness, then spiciness, then adventurousness). Their pick sets
    that dimension fast.
  - After that = king-of-the-hill: the winner stays as the "champion," a new
    challenger is drawn from the top of the sampled ranking each round.
- **Update after each duel (A beat B):**

  ```
  p   = sigmoid(score_A - score_B)      // using current means
  err = 1 - p                           // A won, target = 1
  for each attribute k:
      mean[k] += LR * (attr_A[k] - attr_B[k]) * err   // LR ≈ 0.1
      var[k]  *= 0.97                   // shrink uncertainty slightly
  ```

- **Stop condition = the decision:** when the champion wins 3 duels in a
  row, go to the result screen with it as the hero pick. Also hard-cap
  sessions at ~10 rounds regardless.
- **"Neither":** discard the current champion and jump back to probe pairs;
  allow at most 2 "neither"s per session, then commit to best-so-far.

Expose two API routes, both operating on the signed-in user's row:

- `POST /api/next-pair` → filters catalog by hard constraints, samples
  weights, scores, returns the pair.
- `POST /api/record-duel` → appends to `duels`, applies the Bradley–Terry
  update to `user_taste`, checks the stop condition.

Keep all model state server-side in Postgres; the client only renders cards
and reports taps.

## Seed data

A seed script inserts ~30–40 dishes across varied cuisines, price tiers, and
attribute profiles (with real-looking placeholder image URLs) plus a handful
of restaurants, so the app is fully runnable on first `npm run dev` without
manual data entry.

## Out of scope for v1 — do NOT build

Phone OTP, weather/season/time-of-day conditioning of weights, collaborative
filtering, real delivery/ordering integration, multi-city support.

## Phases

- **Phase 0:** scaffold project, Supabase schema + migrations, seed script.
- **Phase 1:** Google auth + onboarding screen writing `user_constraints`.
- **Phase 1b:** admin dashboard (gated to `ADMIN_EMAILS`) for adding
  restaurants and dishes.
- **Phase 2:** duel loop end-to-end with random pairing (no model yet) →
  result screen. Prove the plumbing.
- **Phase 3:** plug in Thompson sampling + Bradley–Terry + king-of-the-hill
  + probe pairing.
