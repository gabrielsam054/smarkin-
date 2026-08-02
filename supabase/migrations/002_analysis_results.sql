-- Create analysis_results table
create table if not exists public.analysis_results (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references public.analysis_requests(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,

  -- Classification
  industry        text,
  product_family  text,
  product_type    text,
  matched_keywords jsonb default '[]',
  confidence      integer default 0,

  -- Audience
  personas        jsonb default '[]',
  primary_interests   jsonb default '[]',
  secondary_interests jsonb default '[]',
  expansion_interests jsonb default '[]',
  demographics    jsonb default '[]',
  placements      jsonb default '[]',

  -- Psychology
  pain_points     jsonb default '[]',
  goals           jsonb default '[]',
  buying_motivations jsonb default '[]',
  messaging_angles   jsonb default '[]',

  -- Strategy
  campaign_objective      text,
  objective_strategy      text,
  audience_strategy       text,
  audience_strategy_reason text,
  funnel_stage            text,
  creative_format         text,
  creative_hooks          jsonb default '[]',
  optimization_tips       jsonb default '[]',

  -- Summary
  executive_summary text,
  audience_insight  text,

  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists analysis_results_request_id_idx on public.analysis_results (request_id);
create index if not exists analysis_results_user_id_idx on public.analysis_results (user_id);

-- RLS
alter table public.analysis_results enable row level security;

create policy "Users can view own results"
  on public.analysis_results for select
  using (auth.uid() = user_id);

create policy "Users can insert own results"
  on public.analysis_results for insert
  with check (auth.uid() = user_id);
