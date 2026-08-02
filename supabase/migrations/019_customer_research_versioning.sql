-- Adds explicit version metadata for CustomerResearchAsset's repository
-- support. The existing research_version column (018) stays as-is —
-- version_number is the new, explicit per-(user,business) incrementing
-- counter the repository actually queries against; source_data_version
-- is the same staleness field already proven in business_intelligence_profiles,
-- reused for the identical purpose here.

alter table public.customer_research
  add column if not exists version_number integer not null default 1,
  add column if not exists source_data_version text not null default 'v15';

create index if not exists customer_research_versioning_idx
  on public.customer_research (user_id, business_id, version_number desc);
