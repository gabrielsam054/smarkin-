-- Audit log — deliberately separate from Phase 1.5's TraceStore. Diagnostics
-- answers "what happened technically" and is in-memory/ephemeral by design.
-- Audit answers "who did what" and must be durable for security/compliance
-- review, so this is a real, persisted table, not a reuse of the trace store.

create table if not exists public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  "timestamp"  timestamptz not null default now(),
  user_id      uuid references auth.users(id),
  capability   text,
  resource     text,
  action       text,
  result       text not null check (result in ('success', 'denied', 'error')),
  execution_id uuid,
  ip_address   text,
  user_agent   text
);

create index if not exists audit_log_user_id_idx on public.audit_log (user_id);
create index if not exists audit_log_execution_id_idx on public.audit_log (execution_id);

alter table public.audit_log enable row level security;

-- Users can see their own audit history — least privilege, matching every
-- other table this session. Writes happen via the server-side service
-- role (fire-and-forget from secureDispatch.ts), not directly by users.
create policy "Users can view own audit log entries"
  on public.audit_log for select
  using (auth.uid() = user_id);
