-- Drop and recreate analysis_results with full schema matching new engine

drop table if exists public.analysis_results;

create table public.analysis_results (
  id                    uuid primary key default gen_random_uuid(),
  request_id            uuid not null references public.analysis_requests(id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,

  -- Classification
  industry              text,
  product_family        text,
  product_type          text,
  matched_keyword_count integer default 0,
  match_confidence_level text default 'keyword',

  -- Interests (verified Meta Interest Database)
  interests             jsonb default '[]',

  -- Behaviors (verified Meta Ads Manager)
  behaviors             jsonb default '[]',

  -- Demographics (with audience sizes)
  demographics          jsonb default '[]',

  -- Personas
  personas              jsonb default '[]',

  -- Problems
  problems              jsonb default '[]',

  -- Strategy
  campaign_objective          text,
  objective_strategy          text,
  audience_strategy           text,
  audience_strategy_best_for  text,
  funnel_stage                text,
  recommended_objective       text,
  creative_focus              text,
  best_creative_format        text,
  placements                  jsonb default '[]',
  creative_hooks              jsonb default '[]',
  optimization_tips           jsonb default '[]',

  -- Psychology
  customer_goals        jsonb default '[]',
  buying_motivations    jsonb default '[]',
  messaging_angles      jsonb default '[]',

  -- Summary
  executive_summary     text,
  audience_insight      text,
  why_this_audience     text,

  -- Scores
  overall_score         integer default 0,
  score_breakdown       jsonb default '{}',

  created_at            timestamptz not null default now()
);

create index analysis_results_request_id_idx on public.analysis_results (request_id);
create index analysis_results_user_id_idx    on public.analysis_results (user_id);

alter table public.analysis_results enable row level security;

create policy "Users can view own results"
  on public.analysis_results for select
  using (auth.uid() = user_id);

create policy "Users can insert own results"
  on public.analysis_results for insert
  with check (auth.uid() = user_id);
