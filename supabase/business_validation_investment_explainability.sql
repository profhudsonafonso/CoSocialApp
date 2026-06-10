-- Explainability fields for Business Validation investment/fundraising signals.

alter table public.business_validation_investment_signals
  add column if not exists display_name text,
  add column if not exists domain text,
  add column if not exists result_kind text,
  add column if not exists relevance_level text,
  add column if not exists evidence_strength text,
  add column if not exists is_actual_investment_signal boolean default false,
  add column if not exists is_specific_startup_or_product boolean default false,
  add column if not exists matched_problem jsonb default '[]',
  add column if not exists matched_audience jsonb default '[]',
  add column if not exists matched_solution jsonb default '[]',
  add column if not exists matched_business_model jsonb default '[]',
  add column if not exists matched_differentiators jsonb default '[]',
  add column if not exists similarity_reason text,
  add column if not exists novelty_impact_reason text;
