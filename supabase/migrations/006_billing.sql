-- ============================================================
-- SMARKIN AI — MODULE 8: Billing & Subscription Engine
-- Run in Supabase SQL Editor after migration 005.
-- ============================================================

-- ── plans (static seed data) ─────────────────────────────────
create table if not exists public.plans (
  id            text primary key,            -- 'trial' | 'pro' | 'agency'
  name          text not null,
  price_usd     numeric(10,2) not null,
  billing_cycle text not null,               -- 'one_time' | 'monthly'
  duration_days integer,                     -- null = unlimited
  features      jsonb not null default '[]',
  is_popular    boolean not null default false,
  status        text not null default 'active',
  created_at    timestamptz not null default now()
);

-- No RLS needed — plans are public
alter table public.plans enable row level security;
create policy "Plans are publicly readable"
  on public.plans for select using (true);

-- Seed plan data
insert into public.plans (id, name, price_usd, billing_cycle, duration_days, features, is_popular) values
(
  'trial',
  '3-Day Access',
  3.99,
  'one_time',
  3,
  '["Unlimited Product Analyses","Full Audience Intelligence Report","Campaign Strategy Engine","AI Creative Studio","Unlimited Saved Reports","PDF Export"]',
  false
),
(
  'pro',
  'Pro',
  19.00,
  'monthly',
  null,
  '["Everything in 3-Day Access","Unlimited monthly usage","Priority support","Faster report generation","New feature access"]',
  true
),
(
  'agency',
  'Agency',
  39.00,
  'monthly',
  null,
  '["Everything in Pro","Team Workspaces","Multiple Team Members","Shared Projects","White-label Reports","Advanced Exports","Future API Access","Premium Support"]',
  false
)
on conflict (id) do update set
  name = excluded.name,
  price_usd = excluded.price_usd,
  features = excluded.features,
  is_popular = excluded.is_popular;

-- ── subscriptions ─────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  plan_id             text not null references public.plans(id),
  status              text not null default 'active',
    -- 'active' | 'expired' | 'cancelled' | 'past_due' | 'pending'
  provider            text not null default 'paystack',
  payment_reference   text,
  customer_code       text,
  subscription_code   text,
  starts_at           timestamptz not null default now(),
  expires_at          timestamptz,            -- null = no expiry (monthly until cancelled)
  next_billing_at     timestamptz,
  cancelled_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists subscriptions_status_idx  on public.subscriptions(status);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscriptions"
  on public.subscriptions for select using (auth.uid() = user_id);
create policy "Users can insert own subscriptions"
  on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can update own subscriptions"
  on public.subscriptions for update using (auth.uid() = user_id);

-- ── payment_history ───────────────────────────────────────────
create table if not exists public.payment_history (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  subscription_id   uuid references public.subscriptions(id) on delete set null,
  amount            numeric(10,2) not null,
  currency          text not null default 'GHS',
  reference         text not null unique,
  paystack_ref      text,
  status            text not null default 'pending',
    -- 'pending' | 'success' | 'failed' | 'refunded'
  provider          text not null default 'paystack',
  plan_id           text references public.plans(id),
  metadata          jsonb default '{}',
  created_at        timestamptz not null default now()
);

create index if not exists payment_history_user_id_idx on public.payment_history(user_id);
create index if not exists payment_history_reference_idx on public.payment_history(reference);

alter table public.payment_history enable row level security;

create policy "Users can view own payment history"
  on public.payment_history for select using (auth.uid() = user_id);
create policy "Users can insert own payments"
  on public.payment_history for insert with check (auth.uid() = user_id);

-- ── usage_tracking ────────────────────────────────────────────
create table if not exists public.usage_tracking (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  billing_period  text not null,   -- 'YYYY-MM'
  analyses        integer not null default 0,
  reports         integer not null default 0,
  exports         integer not null default 0,
  creatives       integer not null default 0,
  updated_at      timestamptz not null default now(),
  unique (user_id, billing_period)
);

create index if not exists usage_tracking_user_id_idx on public.usage_tracking(user_id);

alter table public.usage_tracking enable row level security;

create policy "Users can view own usage"
  on public.usage_tracking for select using (auth.uid() = user_id);
create policy "Users can upsert own usage"
  on public.usage_tracking for all using (auth.uid() = user_id);

-- ── Helper: get active subscription ──────────────────────────
create or replace function public.get_active_subscription(p_user_id uuid)
returns table (
  id uuid, plan_id text, status text,
  starts_at timestamptz, expires_at timestamptz
)
language sql security definer set search_path = public as $$
  select id, plan_id, status, starts_at, expires_at
  from public.subscriptions
  where user_id = p_user_id
    and status = 'active'
    and (expires_at is null or expires_at > now())
  order by created_at desc
  limit 1;
$$;

-- ── Verify ────────────────────────────────────────────────────
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('plans','subscriptions','payment_history','usage_tracking')
order by table_name;
