-- =============================================================================
-- PROJETO MASTER · SEÇÃO 20 — AUDITORIA (registro de atividades)
--
-- Registra automaticamente, no próprio banco, quem CRIOU, ALTEROU ou APAGOU
-- registros importantes do Conecta Comércio, da Sala do Empreendedor e da
-- Fomento Paraná. Aparece em Painel Admin › Administração › Auditoria.
--
-- Cuidados:
--   • guarda QUEM, QUANDO, ONDE e QUAIS CAMPOS mudaram — não guarda os valores
--     (assim não duplica CPF, telefone etc. — LGPD);
--   • só registra ações de quem está logado (visitantes do site não entram);
--   • nunca impede uma ação: se o registro falhar, a ação acontece normalmente;
--   • mudanças só em contadores (visualizações, último acesso...) são ignoradas;
--   • guarda 1 ano de histórico (o mais antigo é limpo automaticamente);
--   • só o administrador geral consegue ler.
--
-- Como usar: Supabase → SQL Editor → cole este arquivo inteiro → Run.
-- Pode rodar mais de uma vez sem problema.
-- =============================================================================

create or replace function public.central_e_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin');
$$;

create table if not exists public.central_atividades (
  id bigserial primary key,
  quando timestamptz not null default now(),
  autor uuid,
  tabela text not null,
  acao text not null,            -- INSERT | UPDATE | DELETE
  registro_id text,
  registro_nome text,
  campos text[]                  -- só os NOMES dos campos alterados
);
create index if not exists central_atividades_quando_idx on public.central_atividades (quando desc);
alter table public.central_atividades enable row level security;
drop policy if exists "admin le atividades" on public.central_atividades;
create policy "admin le atividades" on public.central_atividades for select using (public.central_e_admin());

create or replace function public.central_registrar_atividade()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_novo jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  v_velho jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_ref jsonb := coalesce(v_novo, v_velho);
  v_campos text[];
begin
  if auth.uid() is null then
    return coalesce(new, old); -- visitante/sistema: não registra
  end if;
  begin
    if tg_op = 'UPDATE' then
      select array_agg(k order by k) into v_campos
        from jsonb_each(v_novo) n(k, v)
       where (v_velho -> k) is distinct from v
         and k not in ('atualizado_em', 'updated_at', 'visualizacoes', 'ultimo_acesso', 'ultima_visita');
      if v_campos is null then
        return new; -- só contadores mudaram
      end if;
    end if;
    insert into public.central_atividades (autor, tabela, acao, registro_id, registro_nome, campos)
    values (
      auth.uid(), tg_table_name, tg_op,
      coalesce(v_ref ->> 'id', v_ref ->> 'chave', v_ref ->> 'cnpj'),
      left(coalesce(v_ref ->> 'nome', v_ref ->> 'titulo', v_ref ->> 'criterio', v_ref ->> 'cargo', v_ref ->> 'assunto', v_ref ->> 'chave'), 120),
      v_campos
    );
    if random() < 0.01 then
      delete from public.central_atividades where quando < now() - interval '365 days';
    end if;
  exception when others then
    null; -- nunca atrapalha a ação principal
  end;
  return coalesce(new, old);
end $$;

-- Liga o registro nas tabelas importantes que existirem no banco
do $$
declare
  t text;
begin
  foreach t in array array[
    -- Conecta Comércio
    'perfis', 'empresas', 'prestadores', 'feirantes', 'produtos', 'promocoes', 'combos', 'cupons', 'vagas',
    'noticias', 'banners', 'categorias', 'cursos', 'eventos_calendario', 'pontos_turisticos', 'utilidade_publica',
    'classificados', 'mural_comunidade', 'depoimentos', 'ouvidoria_denuncias', 'faq', 'enquetes', 'site_config',
    'servicos_empreendedor', 'licitacoes',
    -- Sala do Empreendedor
    'sala_config', 'sala_equipe', 'sala_pedidos', 'sala_atendimentos', 'sala_orientacoes', 'sala_documentos',
    'sala_selo_itens', 'sala_calendario',
    -- Fomento Paraná
    'fomento_modulo_config', 'fomento_agentes', 'fomento_linhas', 'fomento_materiais', 'fomento_propostas',
    'fomento_interesses', 'fomento_agenda'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists central_auditoria_trg on public.%I', t);
      execute format('create trigger central_auditoria_trg after insert or update or delete on public.%I for each row execute function public.central_registrar_atividade()', t);
    end if;
  end loop;
end $$;

-- Lista para a tela (com o nome de quem fez)
create or replace function public.central_atividades_lista(p_dias int default 30, p_limite int default 500)
returns table (id bigint, quando timestamptz, autor_nome text, tabela text, acao text, registro_id text, registro_nome text, campos text[])
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.central_e_admin() then
    raise exception 'Somente administradores.';
  end if;
  return query
    select a.id, a.quando, coalesce(p.nome, 'Conta removida'), a.tabela, a.acao, a.registro_id, a.registro_nome, a.campos
      from public.central_atividades a
      left join public.perfis p on p.id = a.autor
     where a.quando >= now() - make_interval(days => greatest(1, least(coalesce(p_dias, 30), 365)))
     order by a.quando desc
     limit greatest(1, least(coalesce(p_limite, 500), 5000));
end $$;

revoke all on function public.central_atividades_lista(int, int) from public, anon;
grant execute on function public.central_e_admin(), public.central_atividades_lista(int, int) to authenticated;
