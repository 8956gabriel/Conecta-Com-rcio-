-- =============================================================================
-- SALA DO EMPREENDEDOR — RETROSPECTIVA (linha do tempo do ano)
-- Rode este arquivo UMA vez no Supabase (SQL Editor) depois dos outros
-- arquivos supabase-sala-*.sql. Pode rodar de novo sem problema.
--
-- • sala_marcos: marcos lançados à mão (inauguração, parceria, prêmio, visita,
--   palestra...). O resto da retrospectiva (atendimentos, eventos do
--   calendário, estratégias, Selo) é montado sozinho a partir das outras tabelas.
-- • sala_config.retrospectiva_publica: liga/desliga a retrospectiva na página pública.
-- =============================================================================

create table if not exists public.sala_marcos (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  titulo text not null,
  descricao text,
  tipo text not null default 'conquista' check (tipo in ('conquista', 'inauguracao', 'parceria', 'capacitacao', 'evento', 'visita', 'outro')),
  foto_url text,
  publicar boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists sala_marcos_data_idx on public.sala_marcos (data);

alter table public.sala_marcos enable row level security;

drop policy if exists "sala marcos publicados" on public.sala_marcos;
create policy "sala marcos publicados" on public.sala_marcos for select using (publicar or public.sala_pode_acessar());
drop policy if exists "sala equipe marcos" on public.sala_marcos;
create policy "sala equipe marcos" on public.sala_marcos for all using (public.sala_pode_acessar()) with check (public.sala_pode_acessar());

alter table public.sala_config
  add column if not exists retrospectiva_publica boolean not null default false;
