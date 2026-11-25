-- =============================================================================
-- SALA DO EMPREENDEDOR — GESTÃO, SELO SEBRAE, ORIENTAÇÕES E LGPD
-- Rode depois de supabase-sala-empreendedor.sql e supabase-sala-planejamento.sql.
-- Supabase → SQL Editor → New query → colar tudo → Run. Pode rodar de novo.
-- Só cria coisas novas: não apaga nada.
-- =============================================================================

-- Encaminhamento e retorno no atendimento
alter table public.sala_atendimentos
  add column if not exists encaminhado_para text,
  add column if not exists retorno_em date;

-- Meta mensal de atendimentos
alter table public.sala_config
  add column if not exists meta_mensal integer not null default 100;

-- -----------------------------------------------------------------------------
-- Selo Sebrae de Referência em Atendimento — checklist por ciclo
-- (critérios carregados do regulamento oficial do ciclo; editáveis)
-- -----------------------------------------------------------------------------
create table if not exists public.sala_selo_itens (
  id uuid primary key default gen_random_uuid(),
  ciclo integer not null,
  numero integer,
  pilar text,
  criterio text not null,
  pontos numeric,
  orientacao text,
  evidencia text,
  responsavel text,
  prazo date,
  status text not null default 'nao_iniciado' check (status in ('nao_iniciado', 'em_andamento', 'concluido')),
  observacao text,
  anexos jsonb not null default '[]',
  atualizado_em timestamptz not null default now()
);
create index if not exists sala_selo_ciclo_idx on public.sala_selo_itens (ciclo, numero);

-- -----------------------------------------------------------------------------
-- Checklists de rotina (diário, semanal, mensal)
-- -----------------------------------------------------------------------------
create table if not exists public.sala_checklist (
  id uuid primary key default gen_random_uuid(),
  frequencia text not null check (frequencia in ('diario', 'semanal', 'mensal')),
  item text not null,
  ordem integer not null default 0,
  ativo boolean not null default true
);
create table if not exists public.sala_checklist_marcas (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.sala_checklist(id) on delete cascade,
  periodo text not null, -- 2026-11-25 (diário) · 2026-S48 (semanal) · 2026-11 (mensal)
  feito_por text,
  feito_em timestamptz not null default now(),
  unique (item_id, periodo)
);

-- -----------------------------------------------------------------------------
-- Biblioteca de documentos e modelos
-- -----------------------------------------------------------------------------
create table if not exists public.sala_documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  categoria text not null default 'Modelos',
  descricao text,
  url text not null,
  enviado_por text,
  criado_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Orientações publicadas pela equipe (além das que já vêm prontas)
-- -----------------------------------------------------------------------------
create table if not exists public.sala_orientacoes (
  id uuid primary key default gen_random_uuid(),
  tema text not null,
  titulo text not null,
  conteudo text not null,
  link text,
  publicar boolean not null default false,
  criado_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- LGPD: registro de quem viu dados pessoais (CPF/CNPJ) e de ações sensíveis
-- -----------------------------------------------------------------------------
create table if not exists public.sala_acessos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid default auth.uid(),
  usuario_nome text,
  acao text not null,     -- ex.: 'viu_documento', 'exportou_relatorio'
  referencia text,        -- ex.: nome do empreendedor
  criado_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Segurança (RLS)
-- -----------------------------------------------------------------------------
alter table public.sala_selo_itens enable row level security;
alter table public.sala_checklist enable row level security;
alter table public.sala_checklist_marcas enable row level security;
alter table public.sala_documentos enable row level security;
alter table public.sala_orientacoes enable row level security;
alter table public.sala_acessos enable row level security;

drop policy if exists "sala equipe selo" on public.sala_selo_itens;
create policy "sala equipe selo" on public.sala_selo_itens for all using (public.sala_pode_acessar()) with check (public.sala_pode_acessar());

drop policy if exists "sala equipe checklist le" on public.sala_checklist;
create policy "sala equipe checklist le" on public.sala_checklist for select using (public.sala_pode_acessar());
drop policy if exists "sala gestor checklist" on public.sala_checklist;
create policy "sala gestor checklist" on public.sala_checklist for all using (public.sala_pode_gerir()) with check (public.sala_pode_gerir());
drop policy if exists "sala equipe checklist marcas" on public.sala_checklist_marcas;
create policy "sala equipe checklist marcas" on public.sala_checklist_marcas for all using (public.sala_pode_acessar()) with check (public.sala_pode_acessar());

drop policy if exists "sala equipe documentos" on public.sala_documentos;
create policy "sala equipe documentos" on public.sala_documentos for all using (public.sala_pode_acessar()) with check (public.sala_pode_acessar());

drop policy if exists "sala orientacoes publicadas" on public.sala_orientacoes;
create policy "sala orientacoes publicadas" on public.sala_orientacoes for select using (publicar or public.sala_pode_acessar());
drop policy if exists "sala equipe orientacoes" on public.sala_orientacoes;
create policy "sala equipe orientacoes" on public.sala_orientacoes for all using (public.sala_pode_acessar()) with check (public.sala_pode_acessar());

-- Registro de acessos: a equipe grava; só o gestor/admin lê; ninguém altera ou apaga
drop policy if exists "sala equipe registra acesso" on public.sala_acessos;
create policy "sala equipe registra acesso" on public.sala_acessos for insert with check (public.sala_pode_acessar() and usuario_id = auth.uid());
drop policy if exists "sala gestor le acessos" on public.sala_acessos;
create policy "sala gestor le acessos" on public.sala_acessos for select using (public.sala_pode_gerir());

-- Contagem de empresas por categoria (para os indicadores — sem dados pessoais)
create or replace function public.sala_indicadores_empresas()
returns table (categoria text, status text, total bigint)
language sql stable security definer set search_path = public as $$
  select e.categoria, e.status, count(*) from public.empresas e
   where public.sala_pode_acessar()
   group by e.categoria, e.status;
$$;
grant execute on function public.sala_indicadores_empresas() to authenticated;
