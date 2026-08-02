-- Learning Engine — first real piece, flagged as the actual long-term moat
-- since the very first layer-diagram turn and left at zero lines of code
-- until now. This is deliberately minimal: it records whether a
-- recommendation actually worked. It does NOT yet feed back into
-- decisionEngine.ts's confidence scoring — that requires real volume of
-- outcomes to be meaningful, and there are zero right now. Building the
-- feedback loop before there's data to feed it would be exactly the
-- "build ahead of real usage" mistake flagged in the original migration
-- roadmap. This table exists so that data can start accumulating from the
-- first real submission onward — the loop closes later, once it's real.

create table if not exists public.decision_outcomes (
  id                  uuid primary key default gen_random_uuid(),
  decision_result_id  uuid not null references public.decision_results(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,

  outcome             text not null check (outcome in ('worked', 'did_not_work', 'too_early_to_tell')),
  notes               text,

  reported_at         timestamptz not null default now()
);

create index if not exists decision_outcomes_result_id_idx on public.decision_outcomes (decision_result_id);
create index if not exists decision_outcomes_user_id_idx on public.decision_outcomes (user_id);

alter table public.decision_outcomes enable row level security;

create policy "Users can view own decision outcomes"
  on public.decision_outcomes for select
  using (auth.uid() = user_id);

create policy "Users can insert own decision outcomes"
  on public.decision_outcomes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own decision outcomes"
  on public.decision_outcomes for update
  using (auth.uid() = user_id);
