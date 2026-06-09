-- Add source metadata for real business validation evidence connectors.

alter table public.business_validation_candidates
  add column if not exists source_type text,
  add column if not exists source_confidence numeric,
  add column if not exists raw_payload jsonb,
  add column if not exists collected_at timestamptz default now();

create index if not exists idx_business_validation_candidates_source_type
  on public.business_validation_candidates(source_type);

create index if not exists idx_business_validation_candidates_collected_at
  on public.business_validation_candidates(collected_at);
