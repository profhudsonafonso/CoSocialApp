-- Persist connector execution status for Business Validation runs.

create extension if not exists "pgcrypto";

create table if not exists public.business_validation_connector_status (
  id uuid primary key default gen_random_uuid(),
  validation_run_id uuid references public.business_validation_runs(id) on delete cascade,
  source_type text not null,
  attempted boolean default false,
  success boolean default false,
  result_count int default 0,
  error_message text,
  created_at timestamptz default now()
);

create index if not exists idx_business_validation_connector_status_run_id
  on public.business_validation_connector_status(validation_run_id);

create index if not exists idx_business_validation_connector_status_source_type
  on public.business_validation_connector_status(source_type);
