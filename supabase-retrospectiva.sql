-- =============================================================================
-- RETROSPECTIVA — tudo o que foi feito no Conecta, na Sala e na Fomento
--
-- Uma função que junta, num período (ex.: o ano todo ou um mês), os números
-- e a agenda dos três ambientes: eventos, cursos, notícias, empresas, vagas,
-- atendimentos da Sala, propostas e visitas da Fomento, visitas ao site...
-- Só números, títulos e datas: nenhum nome, telefone ou documento de pessoa.
-- Quem pode ver: administrador, editor e visualizador.
--
-- Como usar: Supabase → SQL Editor → cole este arquivo inteiro → Run.
-- Pode rodar mais de uma vez sem problema.
-- =============================================================================

create or replace function public.central_retrospectiva(p_inicio date, p_fim date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  i date := coalesce(p_inicio, date_trunc('year', now())::date);
  f date := coalesce(p_fim, (now() at time zone 'America/Sao_Paulo')::date);
  ti timestamptz;
  tf timestamptz;
  conecta jsonb; sala jsonb; fomento jsonb; agenda jsonb; meses jsonb; noticias jsonb;
begin
  if not public.central_e_visualizador() then
    raise exception 'Somente administradores.';
  end if;
  if f < i then raise exception 'Período inválido.'; end if;
  ti := (i::timestamp at time zone 'America/Sao_Paulo');
  tf := ((f + 1)::timestamp at time zone 'America/Sao_Paulo');

  -- ---------------- CONECTA ----------------
  select jsonb_build_object(
    'visitas',          (select count(*) from page_views where tipo = 'entrada' and criado_em >= ti and criado_em < tf),
    'visitantes',       (select count(distinct visitante) from page_views where visitante is not null and criado_em >= ti and criado_em < tf),
    'cliques',          (select count(*) from page_views where tipo = 'clique' and criado_em >= ti and criado_em < tf),
    'novos_usuarios',   (select count(*) from perfis where criado_em >= ti and criado_em < tf),
    'empresas_novas',   (select count(*) from empresas where criado_em >= ti and criado_em < tf),
    'empresas_aprovadas_total', (select count(*) from empresas where status = 'aprovada'),
    'prestadores_novos',(select count(*) from prestadores where criado_em >= ti and criado_em < tf),
    'produtos_novos',   (select count(*) from produtos where criado_em >= ti and criado_em < tf),
    'promocoes',        (select count(*) from promocoes where criado_em >= ti and criado_em < tf),
    'vagas',            (select count(*) from vagas where criado_em >= ti and criado_em < tf),
    'candidaturas',     (select count(*) from candidaturas where criado_em >= ti and criado_em < tf),
    'noticias',         (select count(*) from noticias where publicada_em >= ti and publicada_em < tf),
    'eventos',          (select count(*) from eventos_calendario where data_inicio between i and f),
    'participantes_eventos', (select count(*) from evento_participantes p join eventos_calendario e on e.id = p.evento_id where e.data_inicio between i and f),
    'compareceram_eventos',  (select count(*) from evento_participantes p join eventos_calendario e on e.id = p.evento_id where e.data_inicio between i and f and p.compareceu),
    'cursos',           (select count(*) from cursos where coalesce(data_inicio, criado_em::date) between i and f),
    'inscricoes_cursos',(select count(*) from curso_inscricoes ci join cursos c on c.id = ci.curso_id where coalesce(c.data_inicio, c.criado_em::date) between i and f),
    'presencas_cursos', (select count(*) from curso_inscricoes ci join cursos c on c.id = ci.curso_id where coalesce(c.data_inicio, c.criado_em::date) between i and f and ci.presenca_confirmada),
    'feirantes',        (select count(*) from feirantes where criado_em >= ti and criado_em < tf),
    'enquetes',         (select count(*) from enquetes where criada_em >= ti and criada_em < tf),
    'votos',            (select count(*) from enquete_votos where criado_em >= ti and criado_em < tf),
    'avaliacoes',       (select count(*) from avaliacoes where criado_em >= ti and criado_em < tf),
    'nota_media',       (select round(avg(nota)::numeric, 2) from avaliacoes where criado_em >= ti and criado_em < tf),
    'ouvidoria',        (select count(*) from ouvidoria_denuncias where criado_em >= ti and criado_em < tf),
    'ouvidoria_respondidas', (select count(*) from ouvidoria_denuncias where criado_em >= ti and criado_em < tf and resposta_admin is not null and resposta_admin <> ''),
    'classificados',    (select count(*) from classificados where criado_em >= ti and criado_em < tf),
    'mural',            (select count(*) from mural_comunidade where criado_em >= ti and criado_em < tf),
    'licitacoes',       (select count(*) from licitacoes where criado_em >= ti and criado_em < tf),
    'categorias_top',   (select coalesce(jsonb_agg(jsonb_build_object('nome', categoria, 'n', n) order by n desc), '[]') from
                          (select coalesce(categoria, '(sem categoria)') categoria, count(*) n from empresas where criado_em >= ti and criado_em < tf group by 1 order by 2 desc limit 8) x),
    'paginas_top',      (select coalesce(jsonb_agg(jsonb_build_object('nome', pagina, 'n', n) order by n desc), '[]') from
                          (select pagina, count(*) n from page_views where tipo = 'pagina' and pagina is not null and criado_em >= ti and criado_em < tf group by 1 order by 2 desc limit 8) x),
    'empresas_mais_vistas', (select coalesce(jsonb_agg(jsonb_build_object('nome', alvo, 'n', n) order by n desc), '[]') from
                          (select alvo, count(*) n from page_views where tipo = 'perfil' and alvo is not null and criado_em >= ti and criado_em < tf group by 1 order by 2 desc limit 8) x)
  ) into conecta;

  -- ---------------- SALA DO EMPREENDEDOR ----------------
  select jsonb_build_object(
    'atendimentos',     (select coalesce(sum(total), 0) from sala_atendimentos_totais where make_date(ano, mes, 1) between date_trunc('month', i)::date and f),
    'atendimentos_categoria', (select coalesce(jsonb_agg(jsonb_build_object('nome', categoria, 'n', n) order by n desc), '[]') from
                          (select categoria, sum(total) n from sala_atendimentos_totais where make_date(ano, mes, 1) between date_trunc('month', i)::date and f group by 1 having sum(total) > 0 order by 2 desc limit 10) x),
    'atendimentos_registrados', (select count(*) from sala_atendimentos where data between i and f),
    'pedidos_site',     (select count(*) from sala_pedidos where criado_em >= ti and criado_em < tf),
    'pedidos_atendidos',(select count(*) from sala_pedidos where criado_em >= ti and criado_em < tf and status = 'atendido'),
    'agenda',           (select count(*) from sala_calendario where data between i and f),
    'orientacoes',      (select count(*) from sala_orientacoes where criado_em >= ti and criado_em < tf),
    'estrategias',      (select count(*) from sala_estrategias where coalesce(data_inicio, criado_em::date) between i and f),
    'estrategias_concluidas', (select count(*) from sala_estrategias where coalesce(data_inicio, criado_em::date) between i and f and status = 'concluida'),
    'documentos',       (select count(*) from sala_documentos where criado_em >= ti and criado_em < tf),
    'selo_concluidos',  (select count(*) from sala_selo_itens where status = 'concluido'),
    'selo_total',       (select count(*) from sala_selo_itens),
    'empresas_base',    (select count(*) from sala_empresas_base where ativo_na_base)
  ) into sala;

  -- ---------------- FOMENTO PARANÁ ----------------
  select jsonb_build_object(
    'propostas',        (select count(*) from fomento_propostas where data_proposta between i and f and status <> 'excluido'),
    'por_status',       (select coalesce(jsonb_agg(jsonb_build_object('nome', status, 'n', n) order by n desc), '[]') from
                          (select status, count(*) n from fomento_propostas where data_proposta between i and f and status <> 'excluido' group by 1) x),
    'concedidas',       (select count(*) from fomento_propostas where data_proposta between i and f and status = 'concedido'),
    'valor_solicitado', (select coalesce(sum(valor_solicitado), 0) from fomento_propostas where data_proposta between i and f and status <> 'excluido'),
    'valor_concedido',  (select coalesce(sum(coalesce(valor_contratado, valor_concedido)), 0) from fomento_propostas where data_proposta between i and f and status = 'concedido'),
    'valor_liberado',   (select coalesce(sum(valor_liberado), 0) from fomento_propostas where data_proposta between i and f),
    'por_linha',        (select coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'n', n) order by n desc), '[]') from
                          (select coalesce(l.nome, p.linha_fomentonet, '(sem linha)') nome, count(*) n from fomento_propostas p left join fomento_linhas l on l.id = p.linha_id
                            where p.data_proposta between i and f and p.status <> 'excluido' group by 1 order by 2 desc limit 8) x),
    'interesses_site',  (select count(*) from fomento_interesses where criado_em >= ti and criado_em < tf),
    'clientes_novos',   (select count(*) from fomento_cp_clientes where criado_em >= ti and criado_em < tf),
    'visitas_realizadas', (select count(*) from fomento_cp_visitas where data_hora >= ti and data_hora < tf and status = 'realizada'),
    'visitas_agendadas',  (select count(*) from fomento_cp_visitas where data_hora >= ti and data_hora < tf),
    'atendimentos',     (select count(*) from fomento_cp_atendimentos where data >= ti and data < tf),
    'campanhas',        (select count(*) from fomento_cp_campanhas where coalesce(inicio, criado_em::date) between i and f),
    'compromissos',     (select count(*) from fomento_agenda where data_hora >= ti and data_hora < tf),
    'compromissos_feitos', (select count(*) from fomento_agenda where data_hora >= ti and data_hora < tf and concluido),
    'pontos',           (select coalesce(sum(pontos * coalesce(quantidade, 1)), 0) from fomento_pontuacao where data between i and f),
    'ranking',          (select jsonb_build_object('posicao', posicao_geral, 'total', total_geral, 'data', data_referencia)
                           from fomento_ranking_oficial where data_referencia <= f order by data_referencia desc limit 1)
  ) into fomento;

  -- ---------------- AGENDA (linha do tempo) ----------------
  select coalesce(jsonb_agg(a order by a->>'data', a->>'titulo'), '[]') into agenda from (
    select jsonb_build_object('data', e.data_inicio, 'titulo', e.titulo, 'ambiente', 'conecta', 'tipo', coalesce(e.tipo, 'evento'), 'local', e.local,
             'publico', (select count(*) from evento_participantes p where p.evento_id = e.id)) a
      from eventos_calendario e where e.data_inicio between i and f
    union all
    select jsonb_build_object('data', coalesce(c.data_inicio, c.criado_em::date), 'titulo', c.titulo, 'ambiente', 'conecta', 'tipo', 'curso', 'local', c.local,
             'publico', (select count(*) from curso_inscricoes ci where ci.curso_id = c.id))
      from cursos c where coalesce(c.data_inicio, c.criado_em::date) between i and f
    union all
    select jsonb_build_object('data', s.data, 'titulo', s.titulo, 'ambiente', 'sala', 'tipo', s.tipo, 'local', null, 'publico', null)
      from sala_calendario s where s.data between i and f
    union all
    select jsonb_build_object('data', coalesce(k.inicio, k.criado_em::date), 'titulo', k.nome, 'ambiente', 'fomento', 'tipo', 'campanha', 'local', null, 'publico', null)
      from fomento_cp_campanhas k where coalesce(k.inicio, k.criado_em::date) between i and f
    union all
    select jsonb_build_object('data', coalesce(s.data_inicio, s.criado_em::date), 'titulo', s.titulo, 'ambiente', 'sala', 'tipo', 'estratégia', 'local', null, 'publico', null)
      from sala_estrategias s where coalesce(s.data_inicio, s.criado_em::date) between i and f
    limit 400
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object('data', (publicada_em at time zone 'America/Sao_Paulo')::date, 'titulo', titulo) order by publicada_em desc), '[]')
    into noticias from (select titulo, publicada_em from noticias where publicada_em >= ti and publicada_em < tf order by publicada_em desc limit 30) x;

  -- ---------------- MÊS A MÊS ----------------
  select coalesce(jsonb_agg(jsonb_build_object(
      'mes', to_char(m, 'YYYY-MM'),
      'visitas', (select count(*) from page_views where tipo = 'entrada' and (criado_em at time zone 'America/Sao_Paulo') >= m and (criado_em at time zone 'America/Sao_Paulo') < m + interval '1 month'),
      'atendimentos_sala', (select coalesce(sum(total), 0) from sala_atendimentos_totais where ano = extract(year from m) and mes = extract(month from m)),
      'propostas', (select count(*) from fomento_propostas where status <> 'excluido' and data_proposta >= m::date and data_proposta < (m + interval '1 month')::date),
      'eventos_cursos', (select count(*) from eventos_calendario where data_inicio >= m::date and data_inicio < (m + interval '1 month')::date)
                       + (select count(*) from cursos where coalesce(data_inicio, criado_em::date) >= m::date and coalesce(data_inicio, criado_em::date) < (m + interval '1 month')::date),
      'empresas', (select count(*) from empresas where (criado_em at time zone 'America/Sao_Paulo') >= m and (criado_em at time zone 'America/Sao_Paulo') < m + interval '1 month')
    ) order by m), '[]') into meses
    from generate_series(date_trunc('month', i::timestamp), date_trunc('month', f::timestamp), interval '1 month') m;

  return jsonb_build_object('inicio', i, 'fim', f, 'conecta', conecta, 'sala', sala, 'fomento', fomento,
                            'agenda', agenda, 'noticias', noticias, 'meses', meses);
end $$;

revoke all on function public.central_retrospectiva(date, date) from public, anon;
grant execute on function public.central_retrospectiva(date, date) to authenticated;
