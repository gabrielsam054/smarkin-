-- Add new taxonomy columns to analysis_results
-- Safe to run even if columns already exist

alter table public.analysis_results
  add column if not exists sector      text,
  add column if not exists category    text,
  add column if not exists sub_category text;

-- Also update analysis_requests if needed
-- (no changes needed there)

-- Verify
select column_name from information_schema.columns
where table_name = 'analysis_results'
  and column_name in ('sector', 'category', 'sub_category');
