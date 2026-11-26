-- =============================================================================
-- PROJETO MASTER · FASE 9 — USUÁRIOS E PERMISSÕES (painel central)
--
-- Uma tela só, no Painel Admin do Conecta Comércio, para ver e ajustar o acesso
-- de cada conta nos três ambientes:
--   • Conecta Comércio → perfis.tipo (cliente / empresario / prestador / admin)
--   • Sala do Empreendedor → sala_equipe (atendente / gestor)
--   • Fomento Paraná → fomento_agentes (agente / gestor)
--
-- Não cria tabelas de perfil novas e não apaga nada: tirar o acesso da Sala ou
-- da Fomento só marca "ativo = false" (o histórico continua lá). Toda mudança
-- fica registrada em central_auditoria.
--
-- As regras valem NO BANCO: as funções conferem se quem chamou é admin geral.
-- Como usar: Supabase → SQL Editor → cole este arquivo inteiro → Run.
-- Pode rodar mais de uma vez sem problema.
-- =============================================================================

create table if not exists public.central_auditoria (
  id bigserial primary key,
  quando timestamptz not null default now(),
  autor uuid references auth.users(id) on delete set null,
  alvo uuid references auth.users(id) on delete set null,
  setor text not null,          -- conecta | sala | fomento
  de text,
  para text,
  detalhe text
);
alter table public.central_auditoria enable row level security;

create or replace function public.central_e_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin');
$$;

drop policy if exists "admin le auditoria central" on public.central_auditoria;
create policy "admin le auditoria central" on public.central_auditoria
  for select using (public.central_e_admin());
-- ninguém grava direto: só pelas funções abaixo (security definer)

-- Lista de contas com o acesso em cada ambiente (só para admin geral)
create or replace function public.central_acessos()
returns table (
  user_id uuid, email text, nome text, tipo text,
  sala_papel text, sala_ativo boolean,
  fomento_papel text, fomento_ativo boolean,
  criado_em timestamptz, ultimo_login timestamptz
)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.central_e_admin() then
    raise exception 'Somente administradores.';
  end if;
  return query
    select p.id, u.email::text, p.nome, p.tipo,
           s.papel, s.ativo, f.papel, f.ativo,
           p.criado_em, u.last_sign_in_at
      from public.perfis p
      join auth.users u on u.id = p.id
      left join public.sala_equipe s on s.user_id = p.id
      left join public.fomento_agentes f on f.user_id = p.id
     order by lower(p.nome);
end $$;

-- Muda o acesso de uma conta em um ambiente
--   p_setor: 'conecta' | 'sala' | 'fomento'
--   p_papel: conecta → cliente|empresario|prestador|admin
--            sala    → nenhum|atendente|gestor
--            fomento → nenhum|agente|gestor
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
    if p_papel not in ('cliente', 'empresario', 'prestador', 'admin') then raise exception 'Perfil inválido.'; end if;
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

revoke all on function public.central_acessos() from public, anon;
revoke all on function public.central_definir_acesso(uuid, text, text) from public, anon;
grant execute on function public.central_e_admin(), public.central_acessos(), public.central_definir_acesso(uuid, text, text) to authenticated;
