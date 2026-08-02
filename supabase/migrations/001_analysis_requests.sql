-- Create analysis_requests table
create table if not exists public.analysis_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  product_name  text not null,
  description   text,
  country       text not null default 'Worldwide',
  business_type text not null,
  objective     text not null,
  image_url     text,
  status        text not null default 'pending',
  created_at    timestamptz not null default now()
);

-- Index for fast user queries
create index if not exists analysis_requests_user_id_idx
  on public.analysis_requests (user_id);

-- Row Level Security
alter table public.analysis_requests enable row level security;

-- Users can only see their own requests
create policy "Users can view own analysis requests"
  on public.analysis_requests
  for select
  using (auth.uid() = user_id);

-- Users can insert their own requests
create policy "Users can insert own analysis requests"
  on public.analysis_requests
  for insert
  with check (auth.uid() = user_id);

-- Users can update their own requests
create policy "Users can update own analysis requests"
  on public.analysis_requests
  for update
  using (auth.uid() = user_id);

-- Create storage bucket for analysis images
insert into storage.buckets (id, name, public)
  values ('analysis-images', 'analysis-images', true)
  on conflict (id) do nothing;

-- Storage policy: authenticated users can upload
create policy "Authenticated users can upload analysis images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'analysis-images');

-- Storage policy: public read
create policy "Public read for analysis images"
  on storage.objects
  for select
  using (bucket_id = 'analysis-images');
