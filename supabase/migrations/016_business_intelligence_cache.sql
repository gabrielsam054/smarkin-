-- Business Intelligence Cache — Phase 1 of the Smarkin OS architecture.
-- Persists gatherBusinessIntelligence()'s output so every future capability
-- (not just Advertising) reuses the same resolved profile instead of each
-- independently recomputing it. gatherBusinessIntelligence() itself is
-- completely unmodified — this table and its accompanying wrapper function
-- only change HOW the profile is retrieved, never what it contains.
--
-- execution_id added to decision_results in the same migration since both
-- are part of this phase's traceability work and decision_results is
-- already being conceptually touched this phase.

create table if not exists public.business_intelligence_profiles (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  product_name            text not null,

  product_profile         jsonb not null,
  customer_profile        jsonb not null,
  interest_profile        jsonb not null,
  psychology_profile      jsonb not null,
  journey_profile         jsonb not null,
  knowledge_graph_profile jsonb not null,
  gaps                    jsonb not null default '[]',

  -- Manually-bumped version string (matches the spreadsheet version numbers
  -- already used this session, e.g. "v15") — a content hash is more correct
  -- long-term but isn't needed for Phase 1; this is honestly a placeholder,
  -- not silently wrong.
  source_data_version     text not null,
  computed_at             timestamptz not null default now()
);

create unique index if not exists business_intelligence_profiles_user_product_idx
  on public.business_intelligence_profiles (user_id, product_name);

alter table public.business_intelligence_profiles enable row level security;

create policy "Users can view own business intelligence profiles"
  on public.business_intelligence_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own business intelligence profiles"
  on public.business_intelligence_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own business intelligence profiles"
  on public.business_intelligence_profiles for update
  using (auth.uid() = user_id);

-- Traceability: one executionId per runSmarkinBrain() call, correlating
-- Message Bus events back to the decision they belong to.
alter table public.decision_results
  add column if not exists execution_id uuid;
