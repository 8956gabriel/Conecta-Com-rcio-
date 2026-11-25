-- =============================================================================
-- SALA DO EMPREENDEDOR — BASE DE EMPRESAS DO MUNICÍPIO
-- Lista de CNPJs de Ivatuba (planilha importada pela equipe e atualizada de
-- tempos em tempos). Cruzada com os atendimentos para medir a cobertura.
-- Rode depois de supabase-sala-empreendedor.sql. Pode rodar de novo.
-- =============================================================================

create table if not exists public.sala_empresas_base (
  cnpj text primary key,                 -- só números, 14 dígitos
  razao_social text not null,
  porte text,                            -- MEI · ME · EPP · DEMAIS
  cnae text,
  municipio text,
  telefone1 text,
  telefone2 text,
  primeira_vez date not null default current_date,   -- quando apareceu na base pela 1ª vez
  atualizado_em timestamptz not null default now(),
  ativo_na_base boolean not null default true        -- false se não veio na última planilha completa
);
create index if not exists sala_empresas_base_porte_idx on public.sala_empresas_base (porte);

create table if not exists public.sala_empresas_importacoes (
  id uuid primary key default gen_random_uuid(),
  arquivo text,
  total integer not null default 0,
  novas integer not null default 0,
  atualizadas integer not null default 0,
  sairam integer not null default 0,
  feito_por text,
  criado_em timestamptz not null default now()
);

alter table public.sala_empresas_base enable row level security;
alter table public.sala_empresas_importacoes enable row level security;

-- A equipe consulta; só gestor/admin importa e altera
drop policy if exists "sala equipe le base empresas" on public.sala_empresas_base;
create policy "sala equipe le base empresas" on public.sala_empresas_base for select using (public.sala_pode_acessar());
drop policy if exists "sala gestor gerencia base empresas" on public.sala_empresas_base;
create policy "sala gestor gerencia base empresas" on public.sala_empresas_base for all using (public.sala_pode_gerir()) with check (public.sala_pode_gerir());

drop policy if exists "sala equipe le importacoes" on public.sala_empresas_importacoes;
create policy "sala equipe le importacoes" on public.sala_empresas_importacoes for select using (public.sala_pode_acessar());
drop policy if exists "sala gestor registra importacao" on public.sala_empresas_importacoes;
create policy "sala gestor registra importacao" on public.sala_empresas_importacoes for insert with check (public.sala_pode_gerir());
