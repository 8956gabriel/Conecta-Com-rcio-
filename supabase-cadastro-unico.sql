-- =============================================================================
-- PROJETO MASTER · SEÇÃO 14 — CADASTRO ÚNICO DE EMPREENDEDORES
--
-- Junta quem aparece na Sala do Empreendedor, na Fomento Paraná e no Conecta
-- Comércio numa lista só, sem duplicar:
--   • a "chave" de cada pessoa/empresa é o CPF ou CNPJ (só números);
--   • quem não tem documento é identificado pelo WhatsApp/telefone;
--   • se um registro tem telefone E documento, os outros registros com o mesmo
--     telefone (mas sem documento) entram na mesma pessoa.
--
-- NÃO copia, move nem apaga nada: é uma consulta em cima das tabelas que já
-- existem. Os históricos continuam separados em cada setor — aqui só aparece
-- quantos registros a pessoa tem em cada um. Só o administrador geral consulta.
--
-- Como usar: Supabase → SQL Editor → cole este arquivo inteiro → Run.
-- Pode rodar mais de uma vez sem problema.
-- =============================================================================

create or replace function public.central_e_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin');
$$;

create or replace function public.central_empreendedores(p_busca text default null)
returns table (
  chave text, tipo text, nome text, empresa text, documento text, whatsapp text,
  sala_atendimentos int, sala_pedidos int,
  fomento_propostas int, fomento_interesses int, fomento_clientes int,
  conecta_empresas int,
  setores int, primeiro timestamptz, ultimo timestamptz, variacoes_nome int
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_busca text := lower(trim(coalesce(p_busca, '')));
  v_digitos text := regexp_replace(coalesce(p_busca, ''), '\D', '', 'g');
begin
  if not public.central_e_admin() then
    raise exception 'Somente administradores.';
  end if;

  return query
  with fontes as (
    -- to_jsonb: funciona mesmo se alguma coluna (cpf, cnpj...) não existir na tabela
    select 'sala_atendimentos'::text as fonte, to_jsonb(t) as j from public.sala_atendimentos t
    union all select 'sala_pedidos', to_jsonb(t) from public.sala_pedidos t
    union all select 'fomento_propostas', to_jsonb(t) from public.fomento_propostas t
    union all select 'fomento_interesses', to_jsonb(t) from public.fomento_interesses t
    union all select 'fomento_clientes', to_jsonb(t) from public.fomento_cp_clientes t
    union all select 'conecta_empresas', to_jsonb(t) from public.empresas t
  ),
  base as (
    select
      f.fonte,
      nullif(trim(case when f.fonte = 'conecta_empresas' then f.j->>'responsavel' else f.j->>'nome' end), '') as b_nome, -- no Conecta, "nome" é o da loja
      nullif(trim(case when f.fonte = 'conecta_empresas' then f.j->>'nome' else coalesce(f.j->>'empresa', f.j->>'razao_social') end), '') as b_empresa,
      nullif(regexp_replace(coalesce(f.j->>'cpf', f.j->>'documento', ''), '\D', '', 'g'), '') as b_doc,
      nullif(regexp_replace(coalesce(f.j->>'cnpj', ''), '\D', '', 'g'), '') as b_cnpj,
      right(nullif(regexp_replace(coalesce(f.j->>'whatsapp', f.j->>'telefone', ''), '\D', '', 'g'), ''), 11) as b_tel,
      (f.j->>'criado_em')::timestamptz as b_quando
    from fontes f
  ),
  com_doc as (
    select b.*,
      case when length(b.b_doc) in (11, 14) then b.b_doc
           when length(b.b_cnpj) = 14 then b.b_cnpj end as b_documento
    from base b
  ),
  mapa_tel as ( -- telefone → documento, quando algum registro tem os dois
    select distinct on (c.b_tel) c.b_tel as m_tel, c.b_documento as m_doc
      from com_doc c
     where c.b_documento is not null and length(c.b_tel) >= 10
     order by c.b_tel, c.b_quando desc nulls last
  ),
  chaves as (
    select c.*,
      case when c.b_documento is not null then 'doc:' || c.b_documento
           when m.m_doc is not null then 'doc:' || m.m_doc
           when length(c.b_tel) >= 10 then 'tel:' || c.b_tel end as b_chave
    from com_doc c left join mapa_tel m on m.m_tel = c.b_tel
  )
  select
    k.b_chave,
    case when k.b_chave like 'tel:%' then 'Telefone'
         when length(substr(k.b_chave, 5)) = 11 then 'CPF' else 'CNPJ' end,
    (array_agg(k.b_nome order by k.b_quando desc nulls last) filter (where k.b_nome is not null))[1],
    (array_agg(k.b_empresa order by k.b_quando desc nulls last) filter (where k.b_empresa is not null))[1],
    case when k.b_chave like 'doc:%' then substr(k.b_chave, 5) end,
    (array_agg(k.b_tel order by k.b_quando desc nulls last) filter (where k.b_tel is not null))[1],
    (count(*) filter (where k.fonte = 'sala_atendimentos'))::int,
    (count(*) filter (where k.fonte = 'sala_pedidos'))::int,
    (count(*) filter (where k.fonte = 'fomento_propostas'))::int,
    (count(*) filter (where k.fonte = 'fomento_interesses'))::int,
    (count(*) filter (where k.fonte = 'fomento_clientes'))::int,
    (count(*) filter (where k.fonte = 'conecta_empresas'))::int,
    (count(distinct split_part(k.fonte, '_', 1)))::int,
    min(k.b_quando), max(k.b_quando),
    (count(distinct lower(k.b_nome)))::int
  from chaves k
  where k.b_chave is not null
  group by k.b_chave
  having v_busca = ''
      or bool_or(lower(coalesce(k.b_nome, '')) like '%' || v_busca || '%')
      or bool_or(lower(coalesce(k.b_empresa, '')) like '%' || v_busca || '%')
      or (length(v_digitos) >= 4 and (k.b_chave like '%' || v_digitos || '%' or bool_or(coalesce(k.b_tel, '') like '%' || v_digitos || '%')))
  order by count(distinct split_part(k.fonte, '_', 1)) desc, max(k.b_quando) desc nulls last
  limit 500;
end $$;

revoke all on function public.central_empreendedores(text) from public, anon;
grant execute on function public.central_e_admin(), public.central_empreendedores(text) to authenticated;
