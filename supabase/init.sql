-- Supabase SQL de inicialização para o projeto ColabSocial

-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- Tabela de ideias de projeto
create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  nome_projeto text not null,
  problema text not null,
  publico text,
  estagio text,
  ajuda text,
  created_at timestamptz not null default now()
);

-- Tabela de colaboradores
create table if not exists public.collaborators (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  area text not null,
  nivel text not null,
  horas text,
  tipo_projeto text,
  contribuicao text,
  created_at timestamptz not null default now()
);

-- Views úteis para consultas simples
create or replace view public.public_ideas as
select id, nome, email, nome_projeto, problema, publico, estagio, ajuda, created_at
from public.ideas
order by created_at desc;

create or replace view public.public_collaborators as
select id, nome, email, area, nivel, horas, tipo_projeto, contribuicao, created_at
from public.collaborators
order by created_at desc;

-- Dados de exemplo
insert into public.ideas (nome, email, nome_projeto, problema, publico, estagio, ajuda)
values
  ('Lucas Silva', 'lucas@exemplo.com', 'EcoHub', 'Pequenos negócios não conseguem organizar recursos sustentáveis.', 'PMEs e consumidores conscientes', 'ideia', 'Design de produto e front-end'),
  ('Mariana Costa', 'mariana@exemplo.com', 'EducaFlow', 'Professores perdem tempo com materiais desatualizados.', 'Educadores e estudantes', 'validacao', 'Estratégias de validação e UX');

insert into public.collaborators (nome, email, area, nivel, horas, tipo_projeto, contribuicao)
values
  ('Rafael Nunes', 'rafael@exemplo.com', 'backend', 'senior', '10', 'saas', 'Desenvolvimento de API e integração com banco de dados'),
  ('Camila Almeida', 'camila@exemplo.com', 'ux', 'pleno', '15', 'mobile', 'Prototipagem e pesquisa de usuário');

-- Consultas exemplo
-- select * from public.public_ideas;
-- select * from public.public_collaborators;
