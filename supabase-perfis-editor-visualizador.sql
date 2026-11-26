-- =============================================================================
-- PROJETO MASTER · SEÇÃO 16 — PERFIS "EDITOR" E "VISUALIZADOR"
--
-- Dois perfis novos para o Painel Admin do Conecta Comércio, além do
-- administrador geral:
--
--   • EDITOR — cuida do CONTEÚDO e da COMUNIDADE: notícias, banners, vagas,
--     calendário de eventos, cursos, turismo, utilidade pública, enquetes,
--     depoimentos, FAQ, mural e classificados (pode criar, editar, aprovar,
--     publicar e apagar). NÃO mexe em comerciantes, usuários, permissões,
--     configurações, ouvidoria nem nos dados da Sala e da Fomento.
--
--   • VISUALIZADOR — só VÊ os números do painel (estatísticas, acessos,
--     comércio). Não cria, não altera e não apaga nada. Não vê dados pessoais
--     (ouvidoria, inscrições, contas de usuário).
--
-- As regras valem NO BANCO (Row Level Security): mesmo que alguém tente pelo
-- navegador, o banco recusa o que o perfil não pode. As regras do
-- administrador continuam exatamente como estão — aqui só se ACRESCENTA.
--
-- Para dar o perfil a alguém: Painel Admin › Administração › Usuários e
-- permissões › coluna Conecta Comércio.
--
-- Como usar: Supabase → SQL Editor → cole este arquivo inteiro → Run.
-- Pode rodar mais de uma vez sem problema.
-- =============================================================================

-- 1) Os tipos de conta passam a aceitar "editor" e "visualizador"
alter table public.perfis drop constraint if exists perfis_tipo_check;
alter table public.perfis add constraint perfis_tipo_check
  check (tipo in ('cliente', 'empresario', 'admin', 'prestador', 'editor', 'visualizador'));

-- 2) Quem é o quê (admin conta como editor e visualizador também)
create or replace function public.central_e_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo in ('admin', 'editor'));
$$;

create or replace function public.central_e_visualizador()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo in ('admin', 'editor', 'visualizador'));
$$;

-- 3) Editor: tudo nas tabelas de conteúdo e comunidade
do $$
declare t text;
begin
  foreach t in array array[
    'noticias', 'banners', 'vagas', 'eventos_calendario', 'cursos', 'pontos_turisticos', 'utilidade_publica',
    'enquetes', 'depoimentos', 'faq', 'mural_comunidade', 'classificados'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "editor gerencia %s" on public.%I', t, t);
      execute format('create policy "editor gerencia %s" on public.%I for all using (public.central_e_editor()) with check (public.central_e_editor())', t, t);
    end if;
  end loop;
  -- resultado das enquetes (só leitura)
  if to_regclass('public.enquete_votos') is not null then
    drop policy if exists "editor le enquete_votos" on public.enquete_votos;
    create policy "editor le enquete_votos" on public.enquete_votos for select using (public.central_e_editor());
  end if;
end $$;

-- Editor: imagens de banners e notícias (só nesses dois lugares de arquivos)
drop policy if exists "editor gerencia arquivos de conteudo" on storage.objects;
create policy "editor gerencia arquivos de conteudo" on storage.objects
  for all using (bucket_id in ('banners', 'uploads') and public.central_e_editor())
  with check (bucket_id in ('banners', 'uploads') and public.central_e_editor());

-- 4) Visualizador: só leitura dos números do painel (sem dados pessoais)
do $$
declare t text;
begin
  foreach t in array array[
    'page_views', 'empresas', 'prestadores', 'produtos', 'vagas', 'promocoes', 'combos', 'cupons',
    'noticias', 'eventos_calendario', 'cursos', 'avaliacoes', 'categorias'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "visualizador le %s" on public.%I', t, t);
      execute format('create policy "visualizador le %s" on public.%I for select using (public.central_e_visualizador())', t, t);
    end if;
  end loop;
end $$;

-- 5) A tela "Usuários e permissões" passa a oferecer os dois perfis
create or replace function public.central_definir_acesso(p_user uuid, p_setor text, p_papel text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_nome text;
  v_de text;
begin
  if not public.central_e_admin() then
    raise exception 'Somente administradores.';
  end if;
  select nome into v_nome from public.perfis where id = p_user;
  if v_nome is null then
    raise exception 'Conta não encontrada.';
  end if;

  if p_setor = 'conecta' then
    if p_papel not in ('cliente', 'empresario', 'prestador', 'editor', 'visualizador', 'admin') then raise exception 'Perfil inválido.'; end if;
    if p_user = auth.uid() and p_papel <> 'admin' then
      raise exception 'Você não pode tirar o seu próprio acesso de administrador.';
    end if;
    select tipo into v_de from public.perfis where id = p_user;
    update public.perfis set tipo = p_papel where id = p_user;

  elsif p_setor = 'sala' then
    if p_papel not in ('nenhum', 'atendente', 'gestor') then raise exception 'Perfil inválido.'; end if;
    select case when ativo then papel else 'nenhum' end into v_de from public.sala_equipe where user_id = p_user;
    if p_papel = 'nenhum' then
      update public.sala_equipe set ativo = false where user_id = p_user;
    else
      insert into public.sala_equipe (user_id, nome, papel, ativo) values (p_user, v_nome, p_papel, true)
      on conflict (user_id) do update set papel = excluded.papel, ativo = true;
    end if;

  elsif p_setor = 'fomento' then
    if p_papel not in ('nenhum', 'agente', 'gestor') then raise exception 'Perfil inválido.'; end if;
    select case when ativo then papel else 'nenhum' end into v_de from public.fomento_agentes where user_id = p_user;
    if p_papel = 'nenhum' then
      update public.fomento_agentes set ativo = false where user_id = p_user;
    else
      insert into public.fomento_agentes (user_id, nome, papel, ativo) values (p_user, v_nome, p_papel, true)
      on conflict (user_id) do update set papel = excluded.papel, ativo = true;
    end if;

  else
    raise exception 'Ambiente inválido.';
  end if;

  insert into public.central_auditoria (autor, alvo, setor, de, para)
  values (auth.uid(), p_user, p_setor, coalesce(v_de, 'nenhum'), p_papel);
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.central_e_editor(), public.central_e_visualizador() to authenticated;
