-- Allow multiple collaborators to work on the same GitHub issue.

alter table public.project_issues
  add column if not exists finalized_at timestamptz,
  add column if not exists finalized_by_email text,
  add column if not exists selected_assignment_id uuid references public.issue_assignments(id);

update public.project_issues
set status = 'open'
where status = 'claimed';

do $$
begin
  alter table public.project_issues
    drop constraint if exists project_issues_status_check;

  alter table public.project_issues
    add constraint project_issues_status_check
    check (status in ('open', 'submitted', 'accepted', 'rejected', 'finalized'));
end $$;

create index if not exists idx_project_issues_finalized_at
  on public.project_issues(finalized_at);

create index if not exists idx_project_issues_selected_assignment_id
  on public.project_issues(selected_assignment_id);

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
  finalized_at,
  finalized_by_email,
  selected_assignment_id,
  synced_at,
  created_at
from public.project_issues
order by created_at desc;
