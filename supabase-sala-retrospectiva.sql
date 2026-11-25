-- =============================================================================
-- SALA DO EMPREENDEDOR — RETROSPECTIVA (linha do tempo do ano)
-- Rode este arquivo UMA vez no Supabase (SQL Editor) depois dos outros
-- arquivos supabase-sala-*.sql. Pode rodar de novo sem problema.
--
-- • sala_marcos: eventos, ações, capacitações, mutirões e outros momentos
--   lançados à mão (com data, local, nº de participantes e foto). O resto da retrospectiva (atendimentos, eventos do
--   calendário, estratégias, Selo) é montado sozinho a partir das outras tabelas.
-- • sala_config.retrospectiva_publica: liga/desliga a retrospectiva na página pública.
-- =============================================================================

create table if not exists public.sala_marcos (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  titulo text not null,
  descricao text,
  tipo text not null default 'evento',
  participantes integer,
  local text,
  foto_url text,
  publicar boolean not null default true,
  criado_em timestamptz not null default now()
);
-- Se a tabela já existia de uma versão anterior, garante as colunas e os tipos novos
alter table public.sala_marcos add column if not exists participantes integer;
alter table public.sala_marcos add column if not exists local text;
alter table public.sala_marcos drop constraint if exists sala_marcos_tipo_check;
alter table public.sala_marcos add constraint sala_marcos_tipo_check
  check (tipo in ('evento', 'acao', 'capacitacao', 'mutirao', 'parceria', 'conquista', 'inauguracao', 'visita', 'outro'));
create index if not exists sala_marcos_data_idx on public.sala_marcos (data);

alter table public.sala_marcos enable row level security;

drop policy if exists "sala marcos publicados" on public.sala_marcos;
create policy "sala marcos publicados" on public.sala_marcos for select using (publicar or public.sala_pode_acessar());
drop policy if exists "sala equipe marcos" on public.sala_marcos;
create policy "sala equipe marcos" on public.sala_marcos for all using (public.sala_pode_acessar()) with check (public.sala_pode_acessar());

alter table public.sala_config
  add column if not exists retrospectiva_publica boolean not null default false;
