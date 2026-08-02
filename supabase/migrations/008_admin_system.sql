-- ============================================================
-- SMARKIN AI — MODULE: Admin System
-- Run in Supabase SQL Editor after migration 007.
-- ============================================================

-- ── Table: public.admins ──────────────────────────────────────
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'super_admin'
               check (role in ('super_admin', 'admin', 'support')),
  created_at timestamptz not null default now()
);

-- ── RLS ───────────────────────────────────────────────────────
alter table public.admins enable row level security;

-- Only admins can read the admins table (prevents enumeration)
create policy "Admins can view admin table"
  on public.admins for select
  using (
    exists (
      select 1 from public.admins a
      where a.user_id = auth.uid()
    )
  );

-- Only super_admins can insert/update/delete admin records
create policy "Super admins can manage admins"
  on public.admins for all
  using (
    exists (
      select 1 from public.admins a
      where a.user_id = auth.uid()
        and a.role = 'super_admin'
    )
  );

-- ── Server-side helper: is the current user an admin? ─────────
-- Used by Supabase server client in Server Actions and API routes
create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.admins
    where user_id = p_user_id
  );
$$;

create or replace function public.get_admin_role(p_user_id uuid)
returns text
language sql security definer stable set search_path = public as $$
  select role from public.admins
  where user_id = p_user_id
  limit 1;
$$;

-- ── Seed: insert gabrielsam054@gmail.com as super_admin ───────
-- Safe: uses ON CONFLICT DO NOTHING — never duplicates
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = 'gabrielsam054@gmail.com'
  limit 1;

  if v_user_id is not null then
    insert into public.admins (user_id, role)
    values (v_user_id, 'super_admin')
    on conflict (user_id) do nothing;

    raise notice 'Admin seeded for user_id: %', v_user_id;
  else
    raise notice 'User gabrielsam054@gmail.com not found yet — run this migration again after the user signs up.';
  end if;
end $$;

-- ── Verify ────────────────────────────────────────────────────
select
  a.user_id,
  u.email,
  a.role,
  a.created_at
from public.admins a
join auth.users u on u.id = a.user_id;
