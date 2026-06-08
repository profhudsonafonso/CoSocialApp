-- Database layer for GitHub issue contribution flow

create extension if not exists "pgcrypto";

alter table public.ideas
  add column if not exists github_repo_url text,
  add column if not exists github_owner text,
  add column if not exists github_repo text,
  add column if not exists github_default_branch text default 'main';

create table if not exists public.project_issues (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references public.ideas(id) on delete cascade,
  github_issue_id bigint,
  issue_number int not null,
  title text not null,
  body text,
  state text default 'open',
  labels jsonb default '[]',
  html_url text,
  role_required text,
  points_estimate int default 10,
  status text default 'open' check (status in ('open', 'claimed', 'submitted', 'accepted', 'rejected')),
  synced_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (idea_id, issue_number)
);

create table if not exists public.issue_assignments (
  id uuid primary key default gen_random_uuid(),
  project_issue_id uuid references public.project_issues(id) on delete cascade,
  collaborator_id uuid references public.collaborators(id) on delete cascade,
  claim_key text not null unique,
  branch_name text not null,
  status text default 'claimed' check (status in ('claimed', 'submitted', 'accepted', 'rejected')),
  evidence_url text,
  accepted_points int default 0,
  review_comment text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (project_issue_id, collaborator_id)
);

alter table public.issue_assignments
  add column if not exists pull_request_number int,
  add column if not exists pull_request_url text,
  add column if not exists merged_at timestamptz;

create table if not exists public.github_commits (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.issue_assignments(id) on delete cascade,
  sha text not null,
  message text,
  html_url text,
  author_login text,
  branch_name text,
  raw_payload jsonb,
  received_at timestamptz default now(),
  unique (sha)
);

create table if not exists public.colab_points (
  id uuid primary key default gen_random_uuid(),
  collaborator_id uuid references public.collaborators(id) on delete cascade,
  idea_id uuid references public.ideas(id) on delete cascade,
  assignment_id uuid references public.issue_assignments(id) on delete cascade,
  points int not null,
  reason text,
  created_at timestamptz default now()
);

create index if not exists idx_project_issues_idea_id
  on public.project_issues(idea_id);

create index if not exists idx_project_issues_status
  on public.project_issues(status);

create index if not exists idx_issue_assignments_project_issue_id
  on public.issue_assignments(project_issue_id);

create index if not exists idx_issue_assignments_collaborator_id
  on public.issue_assignments(collaborator_id);

create index if not exists idx_issue_assignments_claim_key
  on public.issue_assignments(claim_key);

create index if not exists idx_issue_assignments_status
  on public.issue_assignments(status);

create index if not exists idx_github_commits_assignment_id
  on public.github_commits(assignment_id);

create index if not exists idx_colab_points_collaborator_id
  on public.colab_points(collaborator_id);

create index if not exists idx_colab_points_idea_id
  on public.colab_points(idea_id);

create index if not exists idx_colab_points_assignment_id
  on public.colab_points(assignment_id);

create or replace view public.public_project_issues as
select
  id,
  idea_id,
  github_issue_id,
  issue_number,
  title,
  body,
  state,
  labels,
  html_url,
  role_required,
  points_estimate,
  status,
  synced_at,
  created_at
from public.project_issues
order by created_at desc;

create or replace view public.public_issue_assignments as
select
  id,
  project_issue_id,
  collaborator_id,
  branch_name,
  pull_request_number,
  pull_request_url,
  merged_at,
  status,
  evidence_url,
  accepted_points,
  review_comment,
  created_at,
  updated_at
from public.issue_assignments
order by created_at desc;

create or replace view public.public_colab_points as
select
  id,
  collaborator_id,
  idea_id,
  assignment_id,
  points,
  reason,
  created_at
from public.colab_points
order by created_at desc;
