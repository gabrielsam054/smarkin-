-- ============================================================
-- SMARKIN AI — MODULE 7: User Management Tables
-- Run in Supabase SQL Editor after existing migrations.
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  first_name  text,
  last_name   text,
  company     text,
  job_title   text,
  country     text,
  avatar_url  text,
  bio         text,
  website     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  full text := coalesce(new.raw_user_meta_data->>'full_name', '');
  fname text;
  lname text;
begin
  fname := trim(split_part(full, ' ', 1));
  lname := trim(substring(full from position(' ' in full || ' ') + 1));
  insert into public.profiles (id, first_name, last_name)
  values (new.id, nullif(fname,''), nullif(lname,''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── user_settings ─────────────────────────────────────────────
create table if not exists public.user_settings (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade unique,
  email_reports     boolean not null default true,
  email_tips        boolean not null default true,
  email_updates     boolean not null default false,
  default_country   text not null default 'Worldwide',
  default_objective text not null default 'Sales',
  theme             text not null default 'dark',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.user_settings enable row level security;
create policy "Users can manage own settings"
  on public.user_settings for all using (auth.uid() = user_id);

-- ── user_activity ─────────────────────────────────────────────
create table if not exists public.user_activity (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  metadata   jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists user_activity_user_id_idx
  on public.user_activity(user_id);
create index if not exists user_activity_created_at_idx
  on public.user_activity(created_at desc);

alter table public.user_activity enable row level security;
create policy "Users can view own activity"
  on public.user_activity for select using (auth.uid() = user_id);
create policy "Users can insert own activity"
  on public.user_activity for insert with check (auth.uid() = user_id);

-- ── saved_reports ─────────────────────────────────────────────
create table if not exists public.saved_reports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  request_id uuid references public.analysis_requests(id) on delete cascade,
  label      text,
  notes      text,
  is_starred boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists saved_reports_user_id_idx
  on public.saved_reports(user_id);

alter table public.saved_reports enable row level security;
create policy "Users can manage own saved reports"
  on public.saved_reports for all using (auth.uid() = user_id);

-- ── user_sessions ─────────────────────────────────────────────
create table if not exists public.user_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  ip_address   text,
  user_agent   text,
  country      text,
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists user_sessions_user_id_idx
  on public.user_sessions(user_id);

alter table public.user_sessions enable row level security;
create policy "Users can view own sessions"
  on public.user_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions"
  on public.user_sessions for insert with check (auth.uid() = user_id);

-- ── Storage: avatars ──────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename='objects' and policyname='Users can upload own avatar'
  ) then
    create policy "Users can upload own avatar"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename='objects' and policyname='Users can update own avatar'
  ) then
    create policy "Users can update own avatar"
      on storage.objects for update to authenticated
      using (bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename='objects' and policyname='Public read avatars'
  ) then
    create policy "Public read avatars"
      on storage.objects for select using (bucket_id = 'avatars');
  end if;
end $$;

-- ── Verify ────────────────────────────────────────────────────
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles','user_settings','user_activity','saved_reports','user_sessions')
order by table_name;
