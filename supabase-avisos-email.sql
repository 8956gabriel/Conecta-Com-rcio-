-- =============================================================================
-- AVISOS POR E-MAIL (Projeto Master · seção 19)
-- Rode no Supabase: SQL Editor > New query > colar tudo > Run. Pode rodar de novo.
--
-- Quando entra um pedido na Sala, um interessado na Fomento ou uma empresa nova,
-- o banco chama https://conectacomercio.app.br/api/aviso-email, que manda o
-- e-mail pelo Resend. Se o envio falhar, o cadastro NÃO é afetado (a chamada
-- é assíncrona, pela extensão pg_net).
--
-- Depois de rodar, grave o segredo (o mesmo valor da variável AVISO_SEGREDO
-- na Vercel) com:
--   update public.avisos_config set segredo = 'COLE-O-SEGREDO-AQUI', ativo = true where id = 1;
-- Para pausar os avisos: update public.avisos_config set ativo = false where id = 1;
-- =============================================================================

create extension if not exists pg_net with schema extensions;

-- Configuração (só o banco lê: RLS ligado e nenhuma regra de acesso).
create table if not exists public.avisos_config (
  id int primary key default 1 check (id = 1),
  url text not null default 'https://conectacomercio.app.br/api/aviso-email',
  segredo text,
  ativo boolean not null default false
);
insert into public.avisos_config (id) values (1) on conflict (id) do nothing;
alter table public.avisos_config enable row level security;
revoke all on public.avisos_config from anon, authenticated;

create or replace function public.avisar_por_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  cfg public.avisos_config;
begin
  select * into cfg from public.avisos_config where id = 1;
  if cfg.ativo is not true or coalesce(cfg.segredo, '') = '' then
    return new;
  end if;
  perform net.http_post(
    url := cfg.url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso-segredo', cfg.segredo),
    body := jsonb_build_object('tabela', tg_table_name, 'registro', to_jsonb(new) - 'documento')
  );
  return new;
exception when others then
  -- Aviso nunca pode impedir o cadastro.
  return new;
end;
$$;

revoke all on function public.avisar_por_email() from public, anon, authenticated;

drop trigger if exists avisar_email_sala_pedidos on public.sala_pedidos;
create trigger avisar_email_sala_pedidos after insert on public.sala_pedidos
  for each row execute function public.avisar_por_email();

drop trigger if exists avisar_email_fomento_interesses on public.fomento_interesses;
create trigger avisar_email_fomento_interesses after insert on public.fomento_interesses
  for each row execute function public.avisar_por_email();

drop trigger if exists avisar_email_empresas on public.empresas;
create trigger avisar_email_empresas after insert on public.empresas
  for each row execute function public.avisar_por_email();
