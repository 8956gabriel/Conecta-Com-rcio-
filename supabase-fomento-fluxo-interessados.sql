-- =============================================================================
-- FOMENTO PARANÁ — FLUXO DE ACOMPANHAMENTO DOS INTERESSADOS (Projeto Master 12.4)
-- Rode no Supabase: SQL Editor > New query > colar tudo > Run. Pode rodar de novo.
--
-- • Amplia as situações aceitas em fomento_interesses para as 8 etapas:
--   1 novo · 2 contatado (primeiro contato) · 3 agendado · 4 atendido ·
--   5 orientacao_documental · 6 em_analise (encaminhado para análise) ·
--   7 acompanhamento · 8 finalizado — e mantém convertido e descartado.
--   Os registros que já existem continuam válidos (nenhum dado é alterado).
-- • Cria o histórico individual de cada interessado (quem moveu, quando, nota).
-- =============================================================================

alter table public.fomento_interesses drop constraint if exists fomento_interesses_status_check;
alter table public.fomento_interesses add constraint fomento_interesses_status_check
  check (status in ('novo','contatado','agendado','atendido','orientacao_documental',
                    'em_analise','acompanhamento','finalizado','convertido','descartado'));

alter table public.fomento_interesses add column if not exists etapa_atualizada_em timestamptz;

create table if not exists public.fomento_interesses_historico (
  id uuid primary key default gen_random_uuid(),
  interesse_id uuid not null references public.fomento_interesses(id) on delete cascade,
  de text,
  para text not null,
  nota text,
  por_nome text,
  criado_em timestamptz not null default now()
);
create index if not exists fomento_interesses_historico_idx
  on public.fomento_interesses_historico (interesse_id, criado_em);

alter table public.fomento_interesses_historico enable row level security;
drop policy if exists "fomento: equipe historico interesses" on public.fomento_interesses_historico;
create policy "fomento: equipe historico interesses" on public.fomento_interesses_historico for all
  using (public.fomento_pode_acessar()) with check (public.fomento_pode_acessar());
