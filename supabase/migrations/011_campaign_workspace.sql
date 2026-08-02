-- ============================================================
-- Smarkin AI — Campaign Workspace Schema
-- Run after migration 010
-- ============================================================

-- ── Campaign Projects ─────────────────────────────────────────
create table if not exists public.campaigns (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  status          text default 'draft',  -- draft, active, paused, completed, archived
  emoji           text default '🎯',
  color           text default '#22C55E',
  -- Brief fields
  business_name   text,
  website         text,
  industry        text,
  product         text,
  price           text,
  offer           text,
  campaign_goal   text,
  budget          text,
  country         text default 'Worldwide',
  competitors     text,
  deadline        text,
  brand_voice     text,
  -- AI Research (populated after brief)
  ai_research     jsonb,
  -- Meta
  overall_health  integer default 0,
  last_active_tab text default 'brief',
  -- Collaboration-ready fields (future)
  workspace_id    uuid,
  version         integer default 1,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_campaigns_user on public.campaigns(user_id);
create index if not exists idx_campaigns_status on public.campaigns(status);

-- RLS
alter table public.campaigns enable row level security;
create policy "Users manage own campaigns"
  on public.campaigns for all using (auth.uid() = user_id);

-- ── Campaign Audiences ────────────────────────────────────────
create table if not exists public.campaign_audiences (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text default 'Primary Audience',
  audience_data   jsonb,  -- full AudienceReport
  confidence      integer default 0,
  is_primary      boolean default true,
  is_saved        boolean default false,
  created_at      timestamptz default now()
);

alter table public.campaign_audiences enable row level security;
create policy "Users manage own audiences"
  on public.campaign_audiences for all using (auth.uid() = user_id);
create index if not exists idx_campaign_audiences_campaign on public.campaign_audiences(campaign_id);

-- ── Campaign Creatives ────────────────────────────────────────
create table if not exists public.campaign_creatives (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  creative_type   text not null,  -- ad_copy, headline, hook, video_script, carousel, image_prompt, cta, offer
  content         text,
  metadata        jsonb,
  is_favorite     boolean default false,
  version         integer default 1,
  created_at      timestamptz default now()
);

alter table public.campaign_creatives enable row level security;
create policy "Users manage own creatives"
  on public.campaign_creatives for all using (auth.uid() = user_id);
create index if not exists idx_campaign_creatives_campaign on public.campaign_creatives(campaign_id);

-- ── Campaign Structure (Ad Sets / Ads) ────────────────────────
create table if not exists public.campaign_structure (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  type            text not null,  -- campaign, adset, ad
  parent_id       uuid references public.campaign_structure(id),
  name            text not null,
  position        integer default 0,
  settings        jsonb,
  created_at      timestamptz default now()
);

alter table public.campaign_structure enable row level security;
create policy "Users manage own structure"
  on public.campaign_structure for all using (auth.uid() = user_id);

-- ── Decision Timeline ─────────────────────────────────────────
create table if not exists public.campaign_decisions (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  decision_type   text not null,
  title           text not null,
  reason          text,
  evidence        text,
  confidence      integer,
  data            jsonb,
  created_at      timestamptz default now()
);

alter table public.campaign_decisions enable row level security;
create policy "Users manage own decisions"
  on public.campaign_decisions for all using (auth.uid() = user_id);
create index if not exists idx_campaign_decisions_campaign on public.campaign_decisions(campaign_id);

-- ── Budget Plans ──────────────────────────────────────────────
create table if not exists public.campaign_budgets (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  total_budget    numeric(10,2),
  daily_budget    numeric(10,2),
  cold_pct        integer default 30,
  retargeting_pct integer default 40,
  lookalike_pct   integer default 30,
  currency        text default 'GHS',
  benchmark_data  jsonb,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.campaign_budgets enable row level security;
create policy "Users manage own budgets"
  on public.campaign_budgets for all using (auth.uid() = user_id);

select 'Campaign workspace schema created' as status;
