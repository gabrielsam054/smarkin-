-- Audience Research capability — third registered capability, after
-- Advertising and Customer Research. Same RLS pattern as every other
-- user-scoped table this session. Deliberately a separate table, not an
-- extension of customer_research — Audience Research answers a different
-- question ("how do we reach them") than Customer Research does ("who are
-- they"), and each capability owns its own asset.
--
-- Column list checked directly against supabaseAudienceResearchRepository.ts's
-- actual insert() call before writing this migration, specifically to
-- avoid repeating the research_logic_version mismatch found and fixed in
-- Customer Research's equivalent table.

create table if not exists public.audience_research (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  business_id               text not null,
  version_number            integer not null default 1,
  source_data_version       text not null default 'v15',

  primary_audiences         jsonb not null default '[]',
  secondary_audiences       jsonb not null default '[]',
  targeting_strategies      jsonb not null default '[]',
  platform_recommendations  jsonb not null default '[]',
  audience_insights         jsonb not null default '[]',
  evidence                  jsonb not null default '[]',
  confidence                integer not null default 0 check (confidence >= 0 and confidence <= 100),
  gaps                      jsonb not null default '[]',

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists audience_research_user_id_idx on public.audience_research (user_id);
create index if not exists audience_research_business_id_idx on public.audience_research (user_id, business_id);
create index if not exists audience_research_versioning_idx
  on public.audience_research (user_id, business_id, version_number desc);

alter table public.audience_research enable row level security;

create policy "Users can view own audience research"
  on public.audience_research for select
  using (auth.uid() = user_id);

create policy "Users can insert own audience research"
  on public.audience_research for insert
  with check (auth.uid() = user_id);

create policy "Users can update own audience research"
  on public.audience_research for update
  using (auth.uid() = user_id);
