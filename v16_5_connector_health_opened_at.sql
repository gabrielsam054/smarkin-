-- ============================================================
-- Smarkin Database v16.5 — connector_health.opened_at
-- Idempotent. Adds the column the circuit-breaker cooldown check
-- actually needs, rather than overloading last_ok_at's meaning.
-- ============================================================
do $$ begin
  if to_regclass('public.connector_health') is not null then
    alter table connector_health add column if not exists opened_at timestamptz;
  end if;
end $$;
