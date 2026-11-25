-- =============================================================================
-- SALA DO EMPREENDEDOR — PLANEJAMENTO (estratégias + calendário)
-- Rode depois do supabase-sala-empreendedor.sql.
-- Supabase → SQL Editor → New query → colar tudo → Run. Pode rodar de novo.
-- Só cria coisas novas: não apaga nada.
-- =============================================================================

-- Estratégias para ajudar o comerciante (as da equipe; as prontas ficam no site)
create table if not exists public.sala_estrategias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  objetivo text,
  publico text,
  passos text,             -- um passo por linha
  mensagem text,           -- texto pronto para WhatsApp / redes
  data_inicio date,
  data_fim date,
  status text not null default 'planejada' check (status in ('planejada', 'em_andamento', 'concluida')),
  publicar boolean not null default false, -- aparece na página pública /sala
  modelo text,             -- de qual estratégia pronta veio (se veio)
  criado_em timestamptz not null default now()
);

-- Eventos do calendário (mutirões, cursos, prazos locais, avisos)
create table if not exists public.sala_calendario (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  titulo text not null,
  descricao text,
  tipo text not null default 'evento' check (tipo in ('evento', 'mutirao', 'curso', 'prazo', 'aviso')),
  publicar boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists sala_calendario_data_idx on public.sala_calendario (data);

alter table public.sala_estrategias enable row level security;
alter table public.sala_calendario enable row level security;

drop policy if exists "sala estrategias publicadas" on public.sala_estrategias;
create policy "sala estrategias publicadas" on public.sala_estrategias for select using (publicar or public.sala_pode_acessar());
drop policy if exists "sala equipe estrategias" on public.sala_estrategias;
create policy "sala equipe estrategias" on public.sala_estrategias for all using (public.sala_pode_acessar()) with check (public.sala_pode_acessar());

drop policy if exists "sala calendario publicado" on public.sala_calendario;
create policy "sala calendario publicado" on public.sala_calendario for select using (publicar or public.sala_pode_acessar());
drop policy if exists "sala equipe calendario" on public.sala_calendario;
create policy "sala equipe calendario" on public.sala_calendario for all using (public.sala_pode_acessar()) with check (public.sala_pode_acessar());
