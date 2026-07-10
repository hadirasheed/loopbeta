-- ---------------------------------------------------------------------------
-- AI tagging providers: usage tracking + health + an optional token budget.
-- These columns let the admin AI-settings screen show a "Test" result, usage
-- details, and a usage percentage against a soft budget. RLS is unchanged
-- (enabled, no policies) so only the service-role admin routes touch the table.
-- ---------------------------------------------------------------------------

alter table public.llm_providers
  add column if not exists usage_requests bigint not null default 0,
  add column if not exists usage_input_tokens bigint not null default 0,
  add column if not exists usage_output_tokens bigint not null default 0,
  add column if not exists token_budget bigint,          -- optional soft cap for the % display
  add column if not exists last_used_at timestamptz,      -- last successful tag/ping
  add column if not exists last_ok_at timestamptz,        -- last successful "Test"
  add column if not exists last_error text;               -- last error message, for quick diagnosis
