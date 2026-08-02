-- Fixes a real gap found while building the decision report page: channelData
-- from runSmarkinBrain()'s channelExecution (the actual Meta interests, GBP
-- checklist, Email sequence, Content Marketing tasks — everything built
-- across the four channel-adapter turns) was being computed and then
-- discarded before ever reaching the database. decision_results had no
-- column for it at all.

alter table public.decision_results
  add column if not exists channel_execution jsonb;
