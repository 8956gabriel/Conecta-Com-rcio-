-- =============================================================================
-- SALA DO EMPREENDEDOR — AVISOS E PUBLICAÇÕES (modelos padrão)
-- Rode este arquivo UMA vez no Supabase (SQL Editor). Pode rodar de novo.
--
-- • sala_avisos: vaga de emprego, licitação, curso, mutirão, sala fechada,
--   horário especial, prazo do MEI e aviso geral. Aparecem na página pública
--   da Sala enquanto estiverem dentro do período (início → fim).
-- • noticias.origem: permite que a equipe da Sala publique (e edite só as
--   suas) notícias no Conecta Comércio, sem mexer nas notícias do admin.
-- =============================================================================

create table if not exists public.sala_avisos (
  id uuid primary key default gen_random_uuid(),
  modelo text not null default 'aviso',
  titulo text not null,
  texto text,
  campos jsonb not null default '{}',
  link_url text,
  imagem_url text,
  inicio date not null default current_date,
  fim date,                                   -- vazio = sem prazo
  destaque boolean not null default false,
  publicar boolean not null default true,
  no_conecta boolean not null default false,  -- também vira notícia no Conecta Comércio
  noticia_id uuid,
  criado_por_nome text,
  criado_em timestamptz not null default now()
);
create index if not exists sala_avisos_periodo_idx on public.sala_avisos (inicio, fim);

alter table public.sala_avisos enable row level security;

drop policy if exists "sala avisos publicados" on public.sala_avisos;
create policy "sala avisos publicados" on public.sala_avisos for select
  using ((publicar and inicio <= current_date and (fim is null or fim >= current_date)) or public.sala_pode_acessar());
drop policy if exists "sala equipe avisos" on public.sala_avisos;
create policy "sala equipe avisos" on public.sala_avisos for all
  using (public.sala_pode_acessar()) with check (public.sala_pode_acessar());

-- Notícias publicadas pela Sala no Conecta Comércio
alter table public.noticias add column if not exists origem text;

drop policy if exists "sala equipe cria noticias" on public.noticias;
create policy "sala equipe cria noticias" on public.noticias for insert
  with check (public.sala_pode_acessar() and origem = 'sala');
drop policy if exists "sala equipe altera suas noticias" on public.noticias;
create policy "sala equipe altera suas noticias" on public.noticias for update
  using (public.sala_pode_acessar() and origem = 'sala') with check (public.sala_pode_acessar() and origem = 'sala');
drop policy if exists "sala equipe apaga suas noticias" on public.noticias;
create policy "sala equipe apaga suas noticias" on public.noticias for delete
  using (public.sala_pode_acessar() and origem = 'sala');
