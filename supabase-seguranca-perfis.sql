-- =====================================================================
-- SEGURANÇA — tabela perfis (Fase 0 do Projeto Master)
-- Rode no Supabase: SQL Editor > New query > colar tudo > Run.
-- Pode rodar mais de uma vez sem problema.
--
-- Problema corrigido: a regra "usuario edita seu perfil" deixava qualquer
-- usuário logado mudar a própria coluna "tipo" para 'admin' (ou tirar o
-- próprio bloqueio). O cadastro também grava "tipo" com o valor enviado
-- pelo navegador.
--
-- O que este arquivo faz:
--   1. cria a função eh_admin(), usada para saber se quem chama é admin;
--   2. cria um gatilho que impede quem NÃO é admin de:
--        - se cadastrar como 'admin';
--        - alterar "tipo" ou "bloqueado" depois do cadastro.
-- Admins, o servidor (service_role, usado em /api/admin-criar-usuario) e o
-- próprio SQL Editor continuam podendo alterar normalmente.
-- Nenhum dado é apagado ou modificado.
-- =====================================================================

-- Garante a coluna usada pelo painel (não altera nada se já existir).
alter table public.perfis add column if not exists bloqueado boolean not null default false;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid()
      and tipo = 'admin'
      and coalesce(bloqueado, false) = false
  );
$$;

revoke all on function public.eh_admin() from public;
grant execute on function public.eh_admin() to anon, authenticated;

-- SECURITY INVOKER (padrão): current_user precisa ser quem fez a alteração,
-- não o dono da função.
create or replace function public.perfis_protege_campos()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Servidor (service_role) e SQL Editor (postgres) passam direto.
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;

  -- Admin logado pode tudo.
  if public.eh_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.tipo = 'admin' then
      raise exception 'Não é permitido se cadastrar como administrador.'
        using errcode = '42501';
    end if;
    new.bloqueado := false;
    return new;
  end if;

  -- UPDATE feito pelo próprio usuário (ou por quem não é admin)
  if new.tipo is distinct from old.tipo then
    raise exception 'Só um administrador pode alterar o tipo de usuário.'
      using errcode = '42501';
  end if;
  if new.bloqueado is distinct from old.bloqueado then
    raise exception 'Só um administrador pode bloquear ou desbloquear usuários.'
      using errcode = '42501';
  end if;
  if new.id is distinct from old.id then
    raise exception 'O identificador do perfil não pode ser alterado.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists perfis_protege_campos on public.perfis;
create trigger perfis_protege_campos
  before insert or update on public.perfis
  for each row execute function public.perfis_protege_campos();

-- ---------------------------------------------------------------------
-- CONFERÊNCIA (só leitura) — rode depois e confira o resultado:
-- quem hoje é admin. Se aparecer alguém que você não conhece, bloqueie.
-- ---------------------------------------------------------------------
-- select id, nome, email, criado_em, ultimo_acesso
-- from public.perfis where tipo = 'admin' order by criado_em;
