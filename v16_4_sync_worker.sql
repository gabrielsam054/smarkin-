-- ============================================================
-- Smarkin Database v16.4 — Sync Worker Support
-- Idempotent. Run after smarkin_v16_final.sql (needs sync_jobs to exist).
-- ============================================================

-- The real SKIP LOCKED claim pattern, exposed as an RPC since
-- supabase-js's query builder has no way to express FOR UPDATE SKIP
-- LOCKED directly. Standard idiom: lock+select candidate rows in a
-- subquery (SKIP LOCKED lets concurrent callers skip rows another
-- worker already claimed instead of blocking on them), then UPDATE
-- exactly those rows and return them — atomic, safe under concurrency.
create or replace function claim_sync_jobs(job_limit int default 5)
returns setof sync_jobs
language plpgsql
security definer
as $$
begin
  return query
    update sync_jobs
    set status = 'running', started_at = now(), attempts = attempts + 1
    where id in (
      select id from sync_jobs
      where status = 'queued'
      order by id
      limit job_limit
      for update skip locked
    )
    returning *;
end;
$$;

-- Callable by the service role only (cron route uses the service
-- client) — never exposed to the anon/authenticated PostgREST surface,
-- since claiming jobs is purely a system operation.
revoke execute on function claim_sync_jobs(int) from public, anon, authenticated;
