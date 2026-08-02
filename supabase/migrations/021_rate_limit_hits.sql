-- Production Hardening Sprint, Priority 7 — real, distributed rate
-- limiting. The previous InMemoryRateLimiter used a plain in-process Map:
-- correct on a single machine, but in a real serverless deployment with
-- multiple concurrent function instances, each instance has its own
-- independent counter, meaning the actual enforced limit is the configured
-- limit MULTIPLIED by however many instances happen to be running at once.
-- This table makes the limit real and shared, using the same Postgres
-- database every other piece of this app already depends on — not a new
-- infrastructure dependency (Redis/Upstash), a real one already proven.

create table if not exists public.rate_limit_hits (
  id          bigint generated always as identity primary key,
  bucket_key  text not null,       -- "{key}:{action}", matching the in-memory implementation's composite key
  hit_at      timestamptz not null default now()
);

-- The one index this table's entire query pattern depends on: count hits
-- for a bucket within a recent time window, fast, at real request volume.
create index if not exists rate_limit_hits_bucket_time_idx
  on public.rate_limit_hits (bucket_key, hit_at desc);

-- Old hits are never read after they age out of any real window (max
-- configured window is 60s) — this keeps the table from growing
-- unboundedly. Safe to run manually or on a schedule; not required for
-- correctness, only for table size.
create or replace function public.prune_old_rate_limit_hits() returns void as $$
  delete from public.rate_limit_hits where hit_at < now() - interval '10 minutes';
$$ language sql;

-- No RLS needed — this table has no user-facing read/write API at all;
-- only the server-side SupabaseRateLimiter touches it, via the service
-- role, same trust boundary as every other server-only operation in this
-- app.
alter table public.rate_limit_hits enable row level security;
create policy "Service role only" on public.rate_limit_hits for all using (false);
