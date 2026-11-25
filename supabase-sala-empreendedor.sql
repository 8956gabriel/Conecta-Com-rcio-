-- =============================================================================
-- MÓDULO SALA DO EMPREENDEDOR — Conecta Comércio (Ivatuba)
-- Mesmo modelo do módulo Fomento Paraná:
--   /sala         → página pública (serviços, agendar atendimento, endereço, números)
--   /sala/agente  → área do atendente (pedidos, agenda, atendimentos, relatório)
--   /sala/admin   → administração (tudo acima + configurações e equipe)
--
-- Rode no Supabase → SQL Editor → New query → colar tudo → Run.
-- Pode rodar mais de uma vez. Não apaga nada do que já existe.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Equipe da Sala (quem pode entrar na área do atendente)
-- -----------------------------------------------------------------------------
create table if not exists public.sala_equipe (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.perfis(id) on delete cascade,
  nome text not null,
  whatsapp text,
  papel text not null default 'atendente' check (papel in ('gestor', 'atendente')), -- gestor: mexe em configurações e equipe
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create or replace function public.sala_pode_acessar()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin')
      or exists (select 1 from public.sala_equipe a where a.user_id = auth.uid() and a.ativo);
$$;

create or replace function public.sala_pode_gerir()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin')
      or exists (select 1 from public.sala_equipe a where a.user_id = auth.uid() and a.ativo and a.papel = 'gestor');
$$;

-- Acha a conta (já cadastrada no Conecta Comércio) pelo e-mail, para liberar acesso
create or replace function public.sala_buscar_usuario(p_email text)
returns uuid language plpgsql stable security definer set search_path = public, auth as $$
declare v uuid;
begin
  if not public.sala_pode_gerir() then return null; end if;
  select u.id into v from auth.users u
    join public.perfis p on p.id = u.id
   where lower(u.email) = lower(trim(p_email)) limit 1;
  return v;
end;
$$;

-- -----------------------------------------------------------------------------
-- Configuração da página pública (1 linha só)
-- -----------------------------------------------------------------------------
create table if not exists public.sala_config (
  id integer primary key default 1 check (id = 1),
  ativo boolean not null default true,
  texto_intro text,
  atendente_nome text,
  whatsapp text,
  email text,
  endereco text,
  horario_texto text,
  mapa_url text,
  logo_url text,
  banner_url text,
  agenda_ativa boolean not null default true,
  agenda_horarios text not null default '08:30,09:00,09:30,10:00,10:30,11:00,13:30,14:00,14:30,15:00,15:30,16:00',
  agenda_dias text not null default '1,2,3,4,5', -- 0 = domingo ... 6 = sábado
  atualizado_em timestamptz not null default now()
);
insert into public.sala_config (id) values (1) on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Pedidos de atendimento / agendamentos feitos pelo site
-- -----------------------------------------------------------------------------
create table if not exists public.sala_pedidos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  whatsapp text not null,
  documento text,
  servico text,
  mensagem text,
  data_agendada date,
  hora_agendada text,
  status text not null default 'novo' check (status in ('novo', 'agendado', 'atendido', 'cancelado')),
  origem text not null default 'site', -- site | balcao
  observacao_interna text,
  criado_em timestamptz not null default now()
);
-- Um horário só pode ter um agendamento ativo
create unique index if not exists sala_pedidos_horario_unico
  on public.sala_pedidos (data_agendada, hora_agendada)
  where data_agendada is not null and hora_agendada is not null and status in ('novo', 'agendado');

-- -----------------------------------------------------------------------------
-- Atendimentos realizados (a ficha do atendente)
-- -----------------------------------------------------------------------------
create table if not exists public.sala_atendimentos (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  nome text not null,
  documento text,
  whatsapp text,
  empresa text,
  categoria text not null,
  canal text not null default 'presencial',     -- presencial | whatsapp | telefone | online
  situacao text not null default 'concluido' check (situacao in ('concluido', 'pendente', 'encaminhado')),
  observacoes text,
  pedido_id uuid references public.sala_pedidos(id) on delete set null,
  atendente_id uuid references public.sala_equipe(id) on delete set null,
  atendente_nome text,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now()
);
create index if not exists sala_atendimentos_data_idx on public.sala_atendimentos (data);

-- -----------------------------------------------------------------------------
-- Segurança (RLS)
-- -----------------------------------------------------------------------------
alter table public.sala_equipe enable row level security;
alter table public.sala_config enable row level security;
alter table public.sala_pedidos enable row level security;
alter table public.sala_atendimentos enable row level security;

drop policy if exists "sala equipe le equipe" on public.sala_equipe;
create policy "sala equipe le equipe" on public.sala_equipe for select using (public.sala_pode_acessar());
drop policy if exists "sala gestor gerencia equipe" on public.sala_equipe;
create policy "sala gestor gerencia equipe" on public.sala_equipe for all using (public.sala_pode_gerir()) with check (public.sala_pode_gerir());

drop policy if exists "sala config publica" on public.sala_config;
create policy "sala config publica" on public.sala_config for select using (true);
drop policy if exists "sala gestor edita config" on public.sala_config;
create policy "sala gestor edita config" on public.sala_config for all using (public.sala_pode_gerir()) with check (public.sala_pode_gerir());

drop policy if exists "sala publico cria pedido" on public.sala_pedidos;
create policy "sala publico cria pedido" on public.sala_pedidos for insert
  with check (status = 'novo' and origem = 'site' and observacao_interna is null);
drop policy if exists "sala equipe cria pedido" on public.sala_pedidos;
create policy "sala equipe cria pedido" on public.sala_pedidos for insert with check (public.sala_pode_acessar());
drop policy if exists "sala equipe le pedidos" on public.sala_pedidos;
create policy "sala equipe le pedidos" on public.sala_pedidos for select using (public.sala_pode_acessar());
drop policy if exists "sala equipe altera pedidos" on public.sala_pedidos;
create policy "sala equipe altera pedidos" on public.sala_pedidos for update using (public.sala_pode_acessar()) with check (public.sala_pode_acessar());
drop policy if exists "sala equipe apaga pedidos" on public.sala_pedidos;
create policy "sala equipe apaga pedidos" on public.sala_pedidos for delete using (public.sala_pode_acessar());

drop policy if exists "sala equipe atendimentos" on public.sala_atendimentos;
create policy "sala equipe atendimentos" on public.sala_atendimentos for all using (public.sala_pode_acessar()) with check (public.sala_pode_acessar());

-- Horários já ocupados num dia (a página pública usa — não mostra nome de ninguém)
create or replace function public.sala_horarios_ocupados(p_data date)
returns setof text language sql stable security definer set search_path = public as $$
  select hora_agendada from public.sala_pedidos
   where data_agendada = p_data and hora_agendada is not null and status in ('novo', 'agendado');
$$;

grant execute on function public.sala_horarios_ocupados(date) to anon, authenticated;
grant execute on function public.sala_pode_acessar() to anon, authenticated;
grant execute on function public.sala_pode_gerir() to anon, authenticated;
grant execute on function public.sala_buscar_usuario(text) to authenticated;

-- A equipe (gestor) também pode publicar os totais mensais que aparecem no site
do $$
begin
  if to_regclass('public.sala_atendimentos_totais') is not null then
    execute 'drop policy if exists "sala gestor publica totais" on public.sala_atendimentos_totais';
    execute 'create policy "sala gestor publica totais" on public.sala_atendimentos_totais for all using (public.sala_pode_gerir()) with check (public.sala_pode_gerir())';
  end if;
end $$;
