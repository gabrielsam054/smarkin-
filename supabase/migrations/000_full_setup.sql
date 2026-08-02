-- ============================================================
-- SMARKIN AI — FULL DATABASE SETUP
-- Run this entire script in Supabase SQL Editor.
-- It is safe to run multiple times (uses IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ── 1. analysis_requests ────────────────────────────────────────────────────

create table if not exists public.analysis_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  product_name  text not null,
  description   text,
  country       text not null default 'Worldwide',
  business_type text not null,
  objective     text not null,
  image_url     text,
  status        text not null default 'pending',
  created_at    timestamptz not null default now()
);

create index if not exists analysis_requests_user_id_idx
  on public.analysis_requests (user_id);

alter table public.analysis_requests enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'analysis_requests' and policyname = 'Users can view own analysis requests'
  ) then
    create policy "Users can view own analysis requests"
      on public.analysis_requests for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'analysis_requests' and policyname = 'Users can insert own analysis requests'
  ) then
    create policy "Users can insert own analysis requests"
      on public.analysis_requests for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'analysis_requests' and policyname = 'Users can update own analysis requests'
  ) then
    create policy "Users can update own analysis requests"
      on public.analysis_requests for update using (auth.uid() = user_id);
  end if;
end $$;

-- ── 2. analysis_results ─────────────────────────────────────────────────────

drop table if exists public.analysis_results;

create table public.analysis_results (
  id                          uuid primary key default gen_random_uuid(),
  request_id                  uuid not null references public.analysis_requests(id) on delete cascade,
  user_id                     uuid not null references auth.users(id) on delete cascade,

  -- Classification
  industry                    text,
  product_family              text,
  product_type                text,
  matched_keyword_count       integer default 0,
  match_confidence_level      text default 'keyword',

  -- Audience arrays (JSONB)
  interests                   jsonb default '[]',
  behaviors                   jsonb default '[]',
  demographics                jsonb default '[]',
  personas                    jsonb default '[]',
  problems                    jsonb default '[]',

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
  customer_goals              jsonb default '[]',
  buying_motivations          jsonb default '[]',
  messaging_angles            jsonb default '[]',

  -- Summary
  executive_summary           text,
  audience_insight            text,
  why_this_audience           text,

  -- Scores
  overall_score               integer default 0,
  score_breakdown             jsonb default '{}',

  created_at                  timestamptz not null default now()
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

-- ── 3. Storage bucket ───────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
  values ('analysis-images', 'analysis-images', true)
  on conflict (id) do nothing;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'objects' and policyname = 'Authenticated users can upload analysis images'
  ) then
    create policy "Authenticated users can upload analysis images"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'analysis-images');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'objects' and policyname = 'Public read for analysis images'
  ) then
    create policy "Public read for analysis images"
      on storage.objects for select
      using (bucket_id = 'analysis-images');
  end if;
end $$;

-- ── Verify ──────────────────────────────────────────────────────────────────

select
  table_name,
  (select count(*) from information_schema.columns c where c.table_name = t.table_name) as column_count
from information_schema.tables t
where table_schema = 'public'
  and table_name in ('analysis_requests', 'analysis_results')
order by table_name;
