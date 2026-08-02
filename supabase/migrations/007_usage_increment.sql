-- Atomic usage increment via RPC
-- Prevents race conditions when multiple analyses run simultaneously

create or replace function public.increment_usage(
  p_user_id       uuid,
  p_billing_period text
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.usage_tracking (user_id, billing_period, analyses)
  values (p_user_id, p_billing_period, 1)
  on conflict (user_id, billing_period)
  do update set
    analyses   = usage_tracking.analyses + 1,
    updated_at = now();
end;
$$;

-- Also add a helper to auto-expire trial subscriptions
-- (run this as a cron job or call it from an API route)
create or replace function public.expire_stale_subscriptions()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  expired_count integer;
begin
  update public.subscriptions
  set status     = 'expired',
      updated_at = now()
  where status     = 'active'
    and expires_at is not null
    and expires_at < now();

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;
