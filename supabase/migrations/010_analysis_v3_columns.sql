-- ============================================================
-- Add Intelligence Engine v3 columns to analysis_results
-- Run after migration 009
-- ============================================================

alter table public.analysis_results
  add column if not exists benchmarks            jsonb,
  add column if not exists recommended_offers    jsonb,
  add column if not exists creative_intelligence jsonb,
  add column if not exists psychology_principles jsonb,
  add column if not exists journey_stage         jsonb,
  add column if not exists playbook              jsonb,
  add column if not exists knowledge_graph_path  text[],
  add column if not exists explainability        jsonb;

-- Index for fast benchmark lookups
create index if not exists idx_analysis_results_industry
  on public.analysis_results (industry);

select 'analysis_results v3 columns added' as status;
