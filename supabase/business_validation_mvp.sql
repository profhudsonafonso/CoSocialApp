-- Minimal business validation MVP persistence.

create extension if not exists "pgcrypto";

create table if not exists public.business_validation_runs (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references public.ideas(id) on delete cascade,
  status text default 'completed',
  idea_name text,
  short_description text,
  problem text,
  target_audience text,
  proposed_solution text,
  declared_differentiators text,
  business_model text,
  market_region text,
  known_competitors text,
  novelty_score int,
  risk_score int,
  differentiation_score int,
  overall_recommendation text,
  created_at timestamptz default now(),
  completed_at timestamptz default now()
);

create table if not exists public.business_validation_queries (
  id uuid primary key default gen_random_uuid(),
  validation_run_id uuid references public.business_validation_runs(id) on delete cascade,
  query_text text not null,
  language text default 'pt',
  query_type text,
  source_target text,
  created_at timestamptz default now()
);

create table if not exists public.business_validation_candidates (
  id uuid primary key default gen_random_uuid(),
  validation_run_id uuid references public.business_validation_runs(id) on delete cascade,
  name text,
  website_url text,
  description text,
  candidate_type text,
  similarity_score int,
  risk_level text,
  evidence_summary text,
  created_at timestamptz default now()
);

create table if not exists public.business_validation_reports (
  id uuid primary key default gen_random_uuid(),
  validation_run_id uuid references public.business_validation_runs(id) on delete cascade,
  markdown_report text,
  executive_summary text,
  main_risks text,
  main_opportunities text,
  recommendation text,
  created_at timestamptz default now()
);

create index if not exists idx_business_validation_runs_idea_id
  on public.business_validation_runs(idea_id);

create index if not exists idx_business_validation_runs_created_at
  on public.business_validation_runs(created_at);

create index if not exists idx_business_validation_queries_run_id
  on public.business_validation_queries(validation_run_id);

create index if not exists idx_business_validation_queries_created_at
  on public.business_validation_queries(created_at);

create index if not exists idx_business_validation_candidates_run_id
  on public.business_validation_candidates(validation_run_id);

create index if not exists idx_business_validation_candidates_created_at
  on public.business_validation_candidates(created_at);

create index if not exists idx_business_validation_reports_run_id
  on public.business_validation_reports(validation_run_id);

create index if not exists idx_business_validation_reports_created_at
  on public.business_validation_reports(created_at);
