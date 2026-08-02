-- ============================================================
-- Smarkin AI — Intelligence Engine v2 Schema
-- Run in Supabase SQL Editor after migration 008.
-- Adds 9 new intelligence tables from the v2 knowledge base.
-- All foreign keys reference existing tables where applicable.
-- ============================================================

-- ── Product Intelligence ──────────────────────────────────────
create table if not exists public.product_intelligence (
  id                    text primary key,
  product_name          text not null,
  product_family        text,
  industry              text,
  category              text,
  subcategory           text,
  price_range           text,
  currency              text default 'USD',
  buying_cycle          text,
  purchase_frequency    text,
  complementary_products text,
  upsell_products       text,
  cross_sell_products   text,
  product_features      text,
  product_benefits      text,
  product_materials     text,
  product_variations    text,
  product_lifecycle     text,
  target_personas       text,
  keywords              text,
  primary_meta_interests text,
  recommended_objective text,
  recommended_creative  text,
  recommended_funnel_stage text,
  seasonal_demand       text,
  ai_confidence         numeric(4,2),
  notes                 text,
  status                text default 'Active',
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists idx_product_intelligence_industry
  on public.product_intelligence (industry);
create index if not exists idx_product_intelligence_category
  on public.product_intelligence (category);

-- ── Marketing Benchmarks ──────────────────────────────────────
create table if not exists public.marketing_benchmarks (
  id                  text primary key,
  industry            text not null,
  campaign_objective  text not null,
  avg_ctr             numeric(6,3),
  avg_cpc             numeric(8,2),
  avg_cpm             numeric(8,2),
  avg_cpa             numeric(8,2),
  conversion_rate     numeric(6,3),
  avg_roas            numeric(6,2),
  frequency           numeric(5,2),
  engagement_rate     numeric(6,3),
  lead_cost           numeric(8,2),
  purchase_cost       numeric(8,2),
  video_view_rate     numeric(6,3),
  benchmark_source    text,
  confidence_level    text,
  region              text default 'Global',
  notes               text,
  created_at          timestamptz default now()
);

create index if not exists idx_benchmarks_industry
  on public.marketing_benchmarks (industry);
create unique index if not exists idx_benchmarks_industry_objective
  on public.marketing_benchmarks (industry, campaign_objective, region);

-- ── Offer Intelligence ────────────────────────────────────────
create table if not exists public.offer_intelligence (
  id                          text primary key,
  offer_name                  text not null,
  offer_type                  text,
  industry                    text,
  funnel_stage                text,
  buying_intent               text,
  best_audience               text,
  best_campaign_objective     text,
  best_creative_type          text,
  urgency_level               text,
  seasonality                 text,
  typical_conversion_strength text,
  example_cta                 text,
  ai_explanation              text,
  status                      text default 'Active',
  created_at                  timestamptz default now()
);

-- ── Creative Intelligence ─────────────────────────────────────
create table if not exists public.creative_intelligence (
  id                          text primary key,
  creative_format             text not null,
  hook_type                   text,
  visual_style                text,
  color_psychology            text,
  emotional_trigger           text,
  cta_placement               text,
  best_industry               text,
  story_framework             text,
  recommended_funnel_stage    text,
  recommended_objective       text,
  avg_ctr_lift                text,
  confidence_score            numeric(4,2),
  example_use_case            text,
  ai_explanation              text,
  created_at                  timestamptz default now()
);

-- ── Marketing Psychology ──────────────────────────────────────
create table if not exists public.marketing_psychology (
  id                  text primary key,
  principle           text not null unique,
  definition          text,
  how_it_works_in_ads text,
  best_industries     text,
  best_funnel_stage   text,
  best_creative_types text,
  best_cta_examples   text,
  pitfalls_to_avoid   text,
  example_ad          text,
  ai_explanation      text,
  created_at          timestamptz default now()
);

-- ── Customer Journey ──────────────────────────────────────────
create table if not exists public.customer_journey (
  id                          text primary key,
  stage                       text not null unique,
  customer_state              text,
  customer_mindset            text,
  recommended_objective       text,
  recommended_audience_strategy text,
  recommended_creative        text,
  recommended_offer           text,
  recommended_cta             text,
  recommended_funnel          text,
  recommended_placements      text,
  key_message                 text,
  psychology_principle        text,
  ai_explanation              text,
  created_at                  timestamptz default now()
);

-- ── Campaign Playbooks ────────────────────────────────────────
create table if not exists public.campaign_playbooks (
  id                    text primary key,
  industry              text not null,
  business_type         text,
  primary_persona       text,
  recommended_funnel    text,
  audience_strategy     text,
  budget_allocation     text,
  creative_strategy     text,
  primary_offer         text,
  campaign_structure    text,
  key_kpis              text,
  optimization_tips     text,
  ai_explanation        text,
  confidence            numeric(4,2),
  created_at            timestamptz default now()
);

create unique index if not exists idx_playbooks_industry
  on public.campaign_playbooks (industry);

-- ── Knowledge Graph Relationships ─────────────────────────────
create table if not exists public.knowledge_graph (
  id                    text primary key,
  source_entity_type    text not null,
  source_id             text,
  source_name           text,
  relationship_type     text not null,
  target_entity_type    text not null,
  target_id             text,
  target_name           text,
  confidence            numeric(4,2),
  weight                numeric(4,2),
  bidirectional         boolean default false,
  explanation           text,
  status                text default 'Active',
  created_at            timestamptz default now()
);

create index if not exists idx_knowledge_graph_source
  on public.knowledge_graph (source_entity_type, source_name);
create index if not exists idx_knowledge_graph_target
  on public.knowledge_graph (target_entity_type, target_name);
create index if not exists idx_knowledge_graph_relationship
  on public.knowledge_graph (relationship_type);

-- ── AI Memory (per user intelligence) ────────────────────────
create table if not exists public.ai_memory (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  memory_type       text not null,
  memory_key        text not null,
  memory_value      text,
  confidence        numeric(4,2) default 0.50,
  source            text,
  times_confirmed   integer default 0,
  last_updated      timestamptz default now(),
  expiry_days       integer default 90,
  ai_explanation    text,
  status            text default 'Active',
  created_at        timestamptz default now()
);

create unique index if not exists idx_ai_memory_user_key
  on public.ai_memory (user_id, memory_key);
create index if not exists idx_ai_memory_user
  on public.ai_memory (user_id);

-- RLS
alter table public.ai_memory enable row level security;
create policy "Users can manage own memory"
  on public.ai_memory for all
  using (auth.uid() = user_id);

-- ── Product Categories (filled) ───────────────────────────────
create table if not exists public.product_categories_v2 (
  id            text primary key,
  category_name text not null,
  industry      text,
  description   text,
  status        text default 'Active',
  created_at    timestamptz default now()
);

create table if not exists public.product_subcategories_v2 (
  id               text primary key,
  subcategory_name text not null,
  category_id      text references public.product_categories_v2(id),
  category_name    text,
  description      text,
  status           text default 'Active',
  created_at       timestamptz default now()
);

-- ── Helper: upsert AI memory ──────────────────────────────────
create or replace function public.upsert_ai_memory(
  p_user_id      uuid,
  p_memory_type  text,
  p_memory_key   text,
  p_memory_value text,
  p_source       text default 'Analysis'
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.ai_memory (user_id, memory_type, memory_key, memory_value, source, times_confirmed, last_updated)
  values (p_user_id, p_memory_type, p_memory_key, p_memory_value, p_source, 1, now())
  on conflict (user_id, memory_key) do update set
    memory_value    = excluded.memory_value,
    times_confirmed = ai_memory.times_confirmed + 1,
    last_updated    = now(),
    confidence      = least(0.99, 0.5 + (ai_memory.times_confirmed + 1) * 0.08);
end;
$$;

-- ── Full-text search indexes ──────────────────────────────────
-- Enable fast search across intelligence tables
create index if not exists idx_product_intel_fts
  on public.product_intelligence using gin(to_tsvector('english', coalesce(product_name,'') || ' ' || coalesce(product_features,'')));

create index if not exists idx_playbooks_fts
  on public.campaign_playbooks using gin(to_tsvector('english', coalesce(industry,'') || ' ' || coalesce(primary_persona,'')));

-- Verify
select 'Intelligence Engine v2 schema created successfully' as status;
