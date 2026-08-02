-- Customer Research capability — second registered capability after
-- Advertising. Same RLS pattern as every other user-scoped table this
-- session (decision_requests, decision_results, business_intelligence_profiles).

create table if not exists public.customer_research (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  business_id       text not null, -- product/business name, same composite-key pattern as business_intelligence_profiles until a real business-entity concept exists
  execution_id      uuid,
  research_version  text not null,

  persona_data      jsonb not null default '[]',
  pain_points       jsonb not null default '[]',
  desires           jsonb not null default '{}',
  motivations       jsonb not null default '{}',
  objections        jsonb not null default '[]',
  journey           jsonb not null default '[]',
  language          jsonb not null default '{}',
  recommendations   jsonb not null default '{}',
  confidence        integer not null default 0 check (confidence >= 0 and confidence <= 100),
  gaps              jsonb not null default '[]',

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists customer_research_user_id_idx on public.customer_research (user_id);
create index if not exists customer_research_business_id_idx on public.customer_research (user_id, business_id);
create index if not exists customer_research_execution_id_idx on public.customer_research (execution_id);

alter table public.customer_research enable row level security;

create policy "Users can view own customer research"
  on public.customer_research for select
  using (auth.uid() = user_id);

create policy "Users can insert own customer research"
  on public.customer_research for insert
  with check (auth.uid() = user_id);

create policy "Users can update own customer research"
  on public.customer_research for update
  using (auth.uid() = user_id);
