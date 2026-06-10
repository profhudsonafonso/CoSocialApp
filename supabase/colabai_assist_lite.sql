-- ColabAI Assist Lite MVP persistence.

create extension if not exists "pgcrypto";

create table if not exists public.ai_credit_accounts (
  id uuid primary key default gen_random_uuid(),
  user_email text not null unique,
  monthly_credits int not null default 20,
  used_credits int not null default 0,
  reset_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  idea_id uuid references public.ideas(id) on delete set null,
  project_issue_id uuid references public.project_issues(id) on delete set null,
  assignment_id uuid references public.issue_assignments(id) on delete set null,
  feature_name text not null,
  provider text not null,
  model text not null,
  input_tokens int default 0,
  output_tokens int default 0,
  estimated_cost_usd numeric default 0,
  credits_charged int not null default 1,
  status text not null default 'completed',
  error_message text,
  created_at timestamptz default now()
);

create table if not exists public.ai_prompts (
  id uuid primary key default gen_random_uuid(),
  feature_name text not null unique,
  title text not null,
  system_prompt text not null,
  user_prompt_template text not null,
  credit_cost int not null default 1,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ai_feature_flags (
  id uuid primary key default gen_random_uuid(),
  feature_name text not null unique,
  enabled boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_ai_credit_accounts_user_email
  on public.ai_credit_accounts(user_email);

create index if not exists idx_ai_usage_events_user_email
  on public.ai_usage_events(user_email);

create index if not exists idx_ai_usage_events_idea_id
  on public.ai_usage_events(idea_id);

create index if not exists idx_ai_usage_events_project_issue_id
  on public.ai_usage_events(project_issue_id);

create index if not exists idx_ai_usage_events_assignment_id
  on public.ai_usage_events(assignment_id);

create index if not exists idx_ai_usage_events_created_at
  on public.ai_usage_events(created_at);

insert into public.ai_prompts (feature_name, title, system_prompt, user_prompt_template, credit_cost, enabled)
values
  (
    'issue_explain',
    'Explicar tarefa',
    'Você é o ColabAI Assist. Explique tarefas GitHub de forma clara, segura e útil para colaboradores.',
    'Explique a tarefa abaixo com: resumo simples, significado de pronto, resultado esperado e riscos principais.\n\n{{context}}',
    1,
    true
  ),
  (
    'technical_plan',
    'Gerar plano técnico',
    'Você é um tech lead pragmático. Gere planos técnicos incrementais para apps Next.js/Supabase.',
    'Gere um plano técnico com etapas, prováveis arquivos/componentes, ordem de implementação e testes.\n\n{{context}}',
    2,
    true
  ),
  (
    'implementation_checklist',
    'Gerar checklist de implementação',
    'Você é um revisor técnico. Transforme issues em checklists verificáveis.',
    'Gere um checklist de implementação com critérios de aceite claros.\n\n{{context}}',
    2,
    true
  ),
  (
    'generate_prompt_pack',
    'Gerar Prompt Pack para IDE',
    'Você cria prompt packs seguros para IDEs com IA, sem pedir segredos ou acesso privilegiado.',
    'Gere um Prompt Pack em Markdown para VS Code, Cursor ou Windsurf com contexto do projeto, contexto da issue, branch, claim key, formato de commit, possíveis arquivos, restrições, prompt de implementação, prompt de teste e prompt de revisão.\n\n{{context}}',
    3,
    true
  ),
  (
    'review_submission',
    'Revisar entrega',
    'Você auxilia responsáveis de projeto a revisar entregas com critério e sem decidir automaticamente.',
    'Revise a submissão com resumo, pontos fortes, fragilidades, testes/docs faltantes, riscos, perguntas e decisão sugerida.\n\n{{context}}',
    3,
    true
  ),
  (
    'validate_delivery',
    'Validar se a entrega atende à issue',
    'Você compara uma entrega com a issue original e aponta lacunas objetivas.',
    'Valide se a entrega atende à issue. Liste requisitos, evidências, lacunas e recomendação final.\n\n{{context}}',
    3,
    true
  )
on conflict (feature_name) do update set
  title = excluded.title,
  system_prompt = excluded.system_prompt,
  user_prompt_template = excluded.user_prompt_template,
  credit_cost = excluded.credit_cost,
  enabled = excluded.enabled,
  updated_at = now();

insert into public.ai_feature_flags (feature_name, enabled, notes)
values
  ('issue_explain', true, 'ColabAI Assist Lite MVP'),
  ('technical_plan', true, 'ColabAI Assist Lite MVP'),
  ('implementation_checklist', true, 'ColabAI Assist Lite MVP'),
  ('generate_prompt_pack', true, 'ColabAI Assist Lite MVP'),
  ('review_submission', true, 'ColabAI Assist Lite MVP'),
  ('validate_delivery', true, 'ColabAI Assist Lite MVP')
on conflict (feature_name) do update set
  enabled = excluded.enabled,
  notes = excluded.notes,
  updated_at = now();
