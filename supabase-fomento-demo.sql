-- =============================================================================
-- FOMENTO PARANÁ · LINK DE DEMONSTRAÇÃO (somente visualização)
--
-- Endereço: fomento-ivatuba.vercel.app/demo
--   • o visitante informa NOME e CIDADE antes de entrar → fica registrado em
--     fomento_demo_visitas (dia, horário e telas que abriu);
--   • ele vê Início, Área do agente e Administração com os dados reais, mas
--     MASCARADOS AQUI NO BANCO: nomes só com a inicial ("J."), sem CPF/CNPJ,
--     WhatsApp, telefone, e-mail, endereço, observações ou documentos;
--   • nada pode ser alterado (o banco não oferece escrita para a demonstração).
--
--   • NOVO: o pedido fica "pendente" até o agente LIBERAR na aba Demonstração.
--
-- Rode este arquivo inteiro no Supabase › SQL Editor (pode rodar de novo).
-- =============================================================================

-- 1) Registro das visitas --------------------------------------------------------
create table if not exists public.fomento_demo_visitas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cidade text not null,
  navegador text,
  paginas text[] not null default '{}',
  criado_em timestamptz not null default now(),
  ultimo_acesso timestamptz not null default now()
);
create index if not exists fomento_demo_visitas_data on public.fomento_demo_visitas (criado_em desc);

alter table public.fomento_demo_visitas enable row level security;
revoke all on public.fomento_demo_visitas from anon, authenticated;
grant select, delete on public.fomento_demo_visitas to authenticated;
drop policy if exists "demo: gestor ve" on public.fomento_demo_visitas;
create policy "demo: gestor ve" on public.fomento_demo_visitas for select to authenticated using (public.fomento_pode_gerir());
drop policy if exists "demo: gestor apaga" on public.fomento_demo_visitas;
create policy "demo: gestor apaga" on public.fomento_demo_visitas for delete to authenticated using (public.fomento_pode_gerir());

-- 1b) Liberação pelo agente: cada pedido começa "pendente" -------------------
alter table public.fomento_demo_visitas add column if not exists status text not null default 'pendente';
alter table public.fomento_demo_visitas add column if not exists liberado_em timestamptz;
alter table public.fomento_demo_visitas add column if not exists entrou_em timestamptz;
grant update (status, liberado_em) on public.fomento_demo_visitas to authenticated;
drop policy if exists "demo: gestor libera" on public.fomento_demo_visitas;
create policy "demo: gestor libera" on public.fomento_demo_visitas for update to authenticated using (public.fomento_pode_gerir()) with check (public.fomento_pode_gerir());

-- 2) Entrada na demonstração --------------------------------------------------
--   devolve o "passe" (id) se a pessoa já foi LIBERADA; senão devolve
--   'pendente' (pedido criado/aguardando) ou 'bloqueado'.
drop function if exists public.fomento_demo_registrar(text, text, text);
create function public.fomento_demo_registrar(p_nome text, p_cidade text, p_navegador text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_status text;
begin
  p_nome := left(trim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g')), 80);
  p_cidade := left(trim(regexp_replace(coalesce(p_cidade, ''), '\s+', ' ', 'g')), 80);
  if char_length(p_nome) < 2 or char_length(p_cidade) < 2 then raise exception 'Informe seu nome e sua cidade.'; end if;

  select id, status into v_id, v_status from public.fomento_demo_visitas
   where lower(nome) = lower(p_nome) and lower(cidade) = lower(p_cidade)
   order by criado_em desc limit 1;

  if not found then
    -- trava simples contra robôs
    if (select count(*) from public.fomento_demo_visitas where criado_em > now() - interval '1 minute') > 30 then
      raise exception 'Muitos acessos agora. Tente de novo em um minuto.';
    end if;
    insert into public.fomento_demo_visitas (nome, cidade, navegador) values (p_nome, p_cidade, left(p_navegador, 200));
    return 'pendente';
  end if;

  if v_status <> 'liberado' then return v_status; end if;

  update public.fomento_demo_visitas
     set entrou_em = now(), ultimo_acesso = now(), navegador = left(p_navegador, 200)
   where id = v_id;
  return v_id::text;
end $$;

-- 3) Marca a tela aberta (para o relatório) -------------------------------------
create or replace function public.fomento_demo_pagina(p_token uuid, p_pagina text)
returns void language sql security definer set search_path = public as $$
  update public.fomento_demo_visitas
     set ultimo_acesso = now(),
         paginas = case when left(p_pagina, 40) = any(paginas) or cardinality(paginas) >= 40 then paginas else paginas || left(p_pagina, 40) end
   where id = p_token and status = 'liberado' and entrou_em > now() - interval '24 hours';
$$;

-- 4) Máscara dos dados -----------------------------------------------------------
create or replace function public.fomento_demo_inicial(t text)
returns text language sql immutable as $$
  select case when coalesce(trim(t), '') = '' then t else upper(left(trim(t), 1)) || '.' end;
$$;

create or replace function public.fomento_demo_mascarar(j jsonb, tabela text)
returns jsonb language plpgsql immutable as $$
declare
  k text;
  -- campos pessoais, documentos e textos livres (podem conter nomes/telefones)
  apagar text[] := array['cpf','cnpj','cpf_cnpj','doc_digitos','whatsapp','zap_digitos','telefone','email',
    'endereco','bairro','lat','lng','latitude','longitude','observacoes','observacao','mensagem','resumo','proxima_acao','resultado_texto',
    'necessidade','objetivo','orcamentos','fornecedores','documentacao','pendencias','motivo_desistencia','motivo_recusa',
    'criado_por','usuario_id','user_id','atualizado_por','arquivo_url'];
begin
  foreach k in array apagar loop
    if j ? k then j := jsonb_set(j, array[k], 'null'::jsonb); end if;
  end loop;
  if tabela in ('fomento_propostas','fomento_interesses','fomento_cp_clientes','fomento_cp_visitas','fomento_agentes') and j ? 'nome' then
    j := jsonb_set(j, '{nome}', to_jsonb(public.fomento_demo_inicial(j->>'nome')));
  end if;
  if tabela = 'fomento_cp_clientes' and j ? 'empresa' then
    j := jsonb_set(j, '{empresa}', coalesce(to_jsonb(public.fomento_demo_inicial(j->>'empresa')), 'null'::jsonb));
  end if;
  if tabela = 'fomento_propostas' then
    if j ? 'numero' and j->>'numero' is not null then j := jsonb_set(j, '{numero}', to_jsonb('•••' || right(j->>'numero', 2))); end if;
    if j ? 'codigo_contrato' and j->>'codigo_contrato' is not null then j := jsonb_set(j, '{codigo_contrato}', to_jsonb('•••' || right(j->>'codigo_contrato', 2))); end if;
  end if;
  if tabela = 'fomento_cp_visitas' and j ? 'resultado' then j := jsonb_set(j, '{resultado}', 'null'::jsonb); end if;
  if tabela = 'fomento_agenda' then j := jsonb_set(j, '{titulo}', '"Compromisso agendado"'::jsonb); end if;
  if tabela = 'fomento_historico' and coalesce(j->>'acao', '') not in ('contratacao','liberacao','encaminhamento','status') then
    j := jsonb_set(j, '{detalhe}', 'null'::jsonb);
  end if;
  return j;
end $$;

-- 5) Leitura da demonstração: só com passe válido (24h) e só tabelas da lista ---
create or replace function public.fomento_demo_dados(p_token uuid, p_tabela text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not exists (select 1 from public.fomento_demo_visitas where id = p_token and status = 'liberado' and entrou_em > now() - interval '24 hours') then
    raise exception 'demo_expirada';
  end if;
  if p_tabela not in ('fomento_propostas','fomento_interesses','fomento_agenda','fomento_agentes','fomento_historico','fomento_pontuacao',
      'fomento_cp_clientes','fomento_cp_atendimentos','fomento_cp_campanhas','fomento_cp_visitas','fomento_cp_dias',
      'fomento_cp_datas','fomento_cp_ideias','fomento_cp_ideias_uso','fomento_cp_metas') then
    return '[]'::jsonb;
  end if;
  execute format('select coalesce(jsonb_agg(public.fomento_demo_mascarar(to_jsonb(t), %L)), ''[]''::jsonb) from (select * from public.%I limit 5000) t', p_tabela, p_tabela) into v;
  return v;
end $$;

revoke all on function public.fomento_demo_registrar(text, text, text) from public;
revoke all on function public.fomento_demo_pagina(uuid, text) from public;
revoke all on function public.fomento_demo_dados(uuid, text) from public;
revoke all on function public.fomento_demo_mascarar(jsonb, text) from public, anon, authenticated;
grant execute on function public.fomento_demo_registrar(text, text, text) to anon, authenticated;
grant execute on function public.fomento_demo_pagina(uuid, text) to anon, authenticated;
grant execute on function public.fomento_demo_dados(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
