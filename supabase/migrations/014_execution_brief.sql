-- executionBriefGenerator.ts (Layer 4) now produces a real ExecutionBrief
-- object as part of runSmarkinBrain()'s output. Same pattern as migration
-- 013 — add the column before it ships, not after discovering the data is
-- being computed and silently discarded.

alter table public.decision_results
  add column if not exists execution_brief jsonb;
