-- =============================================================================
-- VISITAS E CLIQUES — o que é mais visto e mais procurado
--
-- A tabela page_views, que já conta as visitas (só a hora), passa a guardar
-- também ONDE a pessoa esteve e O QUE clicou:
--   tipo      'entrada' (abriu o site — como sempre foi), 'pagina' (trocou de
--             página), 'perfil' (abriu o perfil de uma empresa) ou 'clique'
--             (WhatsApp, Instagram, mapa, telefone, site...)
--   ambiente  conecta | sala | fomento
--   pagina    qual página (ex.: turismo, vagas, sala, fomento-agente)
--   alvo      nome do que foi visto/clicado (empresa, produto, vaga...)
--   alvo_tipo whatsapp | instagram | mapa | telefone | facebook | site | empresa
--   visitante código aleatório do aparelho, só para contar visitantes únicos
--             (não é ligado a nome, e-mail nem conta — nenhum dado pessoal)
--
-- As visitas antigas continuam valendo (entram como 'entrada', ambiente
-- 'conecta'). Quem pode ler: administrador, editor e visualizador.
--
-- Como usar: Supabase → SQL Editor → cole este arquivo inteiro → Run.
-- Pode rodar mais de uma vez sem problema.
-- =============================================================================

alter table public.page_views
  add column if not exists tipo text not null default 'entrada',
  add column if not exists ambiente text not null default 'conecta',
  add column if not exists pagina text,
  add column if not exists alvo text,
  add column if not exists alvo_tipo text,
  add column if not exists alvo_id text,
  add column if not exists visitante text;

-- Limites (o registro vem do navegador de qualquer visitante)
alter table public.page_views drop constraint if exists page_views_valores_check;
alter table public.page_views add constraint page_views_valores_check check (
  tipo in ('entrada', 'pagina', 'perfil', 'clique')
  and ambiente in ('conecta', 'sala', 'fomento')
  and coalesce(length(pagina), 0) <= 60
  and coalesce(length(alvo), 0) <= 160
  and coalesce(length(alvo_tipo), 0) <= 30
  and coalesce(length(alvo_id), 0) <= 60
  and coalesce(length(visitante), 0) <= 60
);
create index if not exists page_views_criado_idx on public.page_views (criado_em desc);

create or replace function public.central_e_visualizador()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo in ('admin', 'editor', 'visualizador'));
$$;

-- Resumo pronto para a tela "Visitas e cliques" (horários em Brasília)
create or replace function public.central_visitas_resumo(p_dias int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_desde timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_dias, 30), 730)));
  v jsonb;
begin
  if not public.central_e_visualizador() then
    raise exception 'Somente administradores.';
  end if;
  with b as (
    select tipo, ambiente, pagina, alvo, alvo_tipo, visitante,
           (criado_em at time zone 'America/Sao_Paulo') as local
      from public.page_views where criado_em >= v_desde
  )
  select jsonb_build_object(
    'entradas', (select count(*) from b where tipo = 'entrada'),
    'visitantes', (select count(distinct visitante) from b where visitante is not null),
    'paginas_vistas', (select count(*) from b where tipo = 'pagina'),
    'perfis', (select count(*) from b where tipo = 'perfil'),
    'cliques', (select count(*) from b where tipo = 'clique'),
    'por_dia', (select coalesce(jsonb_agg(jsonb_build_object('dia', dia, 'n', n) order by dia), '[]') from
                 (select local::date as dia, count(*) as n from b where tipo = 'entrada' group by 1) x),
    'por_hora', (select coalesce(jsonb_agg(jsonb_build_object('hora', h, 'n', n) order by h), '[]') from
                 (select extract(hour from local)::int as h, count(*) as n from b where tipo = 'entrada' group by 1) x),
    'por_semana', (select coalesce(jsonb_agg(jsonb_build_object('dia', d, 'n', n) order by d), '[]') from
                 (select extract(dow from local)::int as d, count(*) as n from b where tipo = 'entrada' group by 1) x),
    'por_ambiente', (select coalesce(jsonb_agg(jsonb_build_object('ambiente', ambiente, 'n', n) order by n desc), '[]') from
                 (select ambiente, count(*) as n from b where tipo in ('entrada', 'pagina') group by 1) x),
    'paginas', (select coalesce(jsonb_agg(jsonb_build_object('ambiente', ambiente, 'pagina', pagina, 'n', n) order by n desc), '[]') from
                 (select ambiente, pagina, count(*) as n from b where tipo = 'pagina' and pagina is not null group by 1, 2 order by 3 desc limit 20) x),
    'perfis_top', (select coalesce(jsonb_agg(jsonb_build_object('alvo', alvo, 'n', n) order by n desc), '[]') from
                 (select alvo, count(*) as n from b where tipo = 'perfil' and alvo is not null group by 1 order by 2 desc limit 20) x),
    'cliques_tipo', (select coalesce(jsonb_agg(jsonb_build_object('alvo_tipo', alvo_tipo, 'n', n) order by n desc), '[]') from
                 (select coalesce(alvo_tipo, 'outro') as alvo_tipo, count(*) as n from b where tipo = 'clique' group by 1) x),
    'cliques_top', (select coalesce(jsonb_agg(jsonb_build_object('alvo_tipo', alvo_tipo, 'alvo', alvo, 'n', n) order by n desc), '[]') from
                 (select coalesce(alvo_tipo, 'outro') as alvo_tipo, alvo, count(*) as n from b where tipo = 'clique' and alvo is not null group by 1, 2 order by 3 desc limit 25) x)
  ) into v;
  return v;
end $$;

revoke all on function public.central_visitas_resumo(int) from public, anon;
grant execute on function public.central_e_visualizador(), public.central_visitas_resumo(int) to authenticated;
