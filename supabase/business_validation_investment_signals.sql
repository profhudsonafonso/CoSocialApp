-- Investment and fundraising evidence layer for Business Validation.

create extension if not exists "pgcrypto";

create table if not exists public.business_validation_investment_signals (
  id uuid primary key default gen_random_uuid(),
  validation_run_id uuid references public.business_validation_runs(id) on delete cascade,
  source_platform text,
  source_category text,
  startup_name text,
  source_url text,
  title text,
  snippet text,
  sector text,
  problem text,
  solution text,
  target_audience text,
  business_model text,
  investment_thesis text,
  traction text,
  customers text,
  revenue_indicators text,
  amount_raised text,
  target_fundraising_amount text,
  ticket_size text,
  valuation text,
  round_status text,
  investment_instrument text,
  use_of_funds text,
  risk_notes text,
  similarity_score int,
  investment_signal_score int,
  market_validation_signal boolean default true,
  innovation_penalty int default 0,
  source_confidence numeric default 0.5,
  provider text,
  raw_payload jsonb,
  collected_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.business_validation_investment_signals
  add column if not exists provider text;

create index if not exists idx_business_validation_investment_signals_run_id
  on public.business_validation_investment_signals(validation_run_id);

create index if not exists idx_business_validation_investment_signals_source_platform
  on public.business_validation_investment_signals(source_platform);

create index if not exists idx_business_validation_investment_signals_source_category
  on public.business_validation_investment_signals(source_category);

create index if not exists idx_business_validation_investment_signals_similarity_score
  on public.business_validation_investment_signals(similarity_score);

create index if not exists idx_business_validation_investment_signals_signal_score
  on public.business_validation_investment_signals(investment_signal_score);
