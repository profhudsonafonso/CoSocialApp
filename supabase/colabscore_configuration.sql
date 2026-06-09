-- ColabScore configuration per project and optional per GitHub issue.

create extension if not exists "pgcrypto";

create table if not exists public.project_colabscore_settings (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references public.ideas(id) on delete cascade unique,
  reference_hourly_value numeric default 50,
  default_validated_hours numeric default 1,
  default_delivery_factor numeric default 1,
  default_impact_factor numeric default 1,
  default_risk_factor numeric default 1,
  min_points int default 1,
  max_points int default 1000,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.issue_colabscore_settings (
  id uuid primary key default gen_random_uuid(),
  project_issue_id uuid references public.project_issues(id) on delete cascade unique,
  validated_hours numeric,
  delivery_factor numeric,
  impact_factor numeric,
  risk_factor numeric,
  manual_points int,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_project_colabscore_settings_idea_id
  on public.project_colabscore_settings(idea_id);

create index if not exists idx_issue_colabscore_settings_project_issue_id
  on public.issue_colabscore_settings(project_issue_id);
