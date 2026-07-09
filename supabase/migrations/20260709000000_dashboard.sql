-- Dashboard additions: dish lifecycle (draft/published), tagging metadata,
-- daypart/season eligibility, and the pluggable LLM provider registry.
-- Additive only — does not recreate or drop existing tables.

-- ---------------------------------------------------------------------------
-- dishes: new columns (defaults keep every existing row valid)
-- ---------------------------------------------------------------------------
alter table public.dishes
  add column if not exists tags               text[] not null default '{}',
  add column if not exists available_dayparts text[] not null default '{}',
  add column if not exists seasons            text[] not null default '{}',
  add column if not exists status             text   not null default 'draft';

-- Backfill: keep all existing sample dishes in the duel pool.
update public.dishes set status = 'published';

-- Guardrails.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'dishes_status_check'
  ) then
    alter table public.dishes
      add constraint dishes_status_check check (status in ('draft', 'published'));
  end if;
end $$;

create index if not exists dishes_status_idx on public.dishes (status);

-- ---------------------------------------------------------------------------
-- llm_providers: config for the AI tagging module. API keys are stored
-- encrypted (AES-256-GCM via ENCRYPTION_KEY). RLS is enabled with NO policies,
-- so anon/authenticated cannot read it at all — only the service-role admin
-- routes touch this table, keeping encrypted keys off the client entirely.
-- ---------------------------------------------------------------------------
create table if not exists public.llm_providers (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  label text,
  api_key_encrypted text,
  is_enabled boolean not null default true,
  is_active_for_tagging boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.llm_providers enable row level security;

-- At most one model may be active for tagging at a time.
create unique index if not exists llm_providers_one_active
  on public.llm_providers (is_active_for_tagging)
  where is_active_for_tagging;
