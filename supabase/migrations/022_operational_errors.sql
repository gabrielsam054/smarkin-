-- Production Hardening Sprint, Priority 8 — error visibility. Logging
-- until now has been write-only: structured JSON to console, genuinely
-- useful (it caught every real bug found during this project), but only
-- if a human happens to be watching Vercel's console at the right moment.
-- This table lets an admin actually query past failures instead.
--
-- Deliberately NOT scoped by per-user RLS like every other table this
-- session — operational errors need to be visible to admins ACROSS every
-- user, and are written by the service role from contexts that don't
-- always have a reliable end-user session (a cache write can fail before
-- any user-facing request context exists). Access control here is
-- enforced by requireAdmin() at the page level, the same real mechanism
-- already gating every other /admin page in this app — not by RLS.

create table if not exists public.operational_errors (
  id           bigint generated always as identity primary key,
  level        text not null check (level in ('warn', 'error')),
  message      text not null,
  category     text,              -- e.g. "pipeline", "repository", "validation", "cache", "external-service"
  execution_id uuid,
  capability   text,
  service      text,
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create index if not exists operational_errors_created_at_idx on public.operational_errors (created_at desc);
create index if not exists operational_errors_category_idx on public.operational_errors (category);

alter table public.operational_errors enable row level security;
create policy "Service role only" on public.operational_errors for all using (false);
