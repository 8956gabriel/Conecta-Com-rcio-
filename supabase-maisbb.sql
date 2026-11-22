-- =============================================================================
-- MAIS BB DIGITAL — Inteligência Comercial e Atendimento
-- Plataforma independente de apoio à atendente do Mais BB Correspondente
-- Autorizado (Ivatuba-PR). Tabelas próprias (prefixo maisbb_), sem relação com
-- o Fomento Paraná nem com os dados do Conecta Comércio. Usa só o login (auth).
-- Pode ser rodado de novo sem estragar nada.
-- =============================================================================

-- 1) USUÁRIOS E PERMISSÕES ----------------------------------------------------
create table if not exists public.maisbb_usuarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  nome text not null,
  email text,
  papel text not null default 'atendente' check (papel in ('admin','atendente')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create table if not exists public.maisbb_convites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nome text not null,
  papel text not null default 'atendente' check (papel in ('admin','atendente')),
  criado_em timestamptz not null default now()
);

create or replace function public.maisbb_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from public.maisbb_usuarios where user_id = auth.uid() and ativo limit 1
$$;
create or replace function public.maisbb_acesso() returns boolean
language sql stable security definer set search_path = public as $$
  select public.maisbb_papel() is not null
$$;
create or replace function public.maisbb_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.maisbb_papel() = 'admin', false)
$$;
grant execute on function public.maisbb_papel(), public.maisbb_acesso(), public.maisbb_admin() to authenticated;

-- Primeiro acesso: se ainda não há nenhum usuário, quem chamar vira administrador.
-- Depois disso, aceita convite pendente pelo e-mail da conta.
create or replace function public.maisbb_entrar() returns text
language plpgsql security definer set search_path = public, auth as $$
declare v_email text; c record; v_nome text;
begin
  if auth.uid() is null then return null; end if;
  if exists (select 1 from maisbb_usuarios where user_id = auth.uid()) then
    return (select case when ativo then papel else 'bloqueado' end from maisbb_usuarios where user_id = auth.uid());
  end if;
  select email into v_email from auth.users where id = auth.uid();
  if not exists (select 1 from maisbb_usuarios) then
    v_nome := coalesce((select nome from public.perfis where id = auth.uid()), split_part(v_email, '@', 1));
    insert into maisbb_usuarios (user_id, nome, email, papel) values (auth.uid(), v_nome, v_email, 'admin');
    return 'admin';
  end if;
  select * into c from maisbb_convites where lower(email) = lower(v_email);
  if found then
    insert into maisbb_usuarios (user_id, nome, email, papel) values (auth.uid(), c.nome, v_email, c.papel);
    delete from maisbb_convites where id = c.id;
    return c.papel;
  end if;
  return null;
end $$;
grant execute on function public.maisbb_entrar() to authenticated;

-- 2) CONFIGURAÇÃO (uma linha) -------------------------------------------------
create table if not exists public.maisbb_config (
  id int primary key default 1 check (id = 1),
  nome_unidade text default 'Mais BB Correspondente Autorizado — Ivatuba/PR',
  logo_path text,
  endereco text,
  whatsapp text,
  horario text,
  pontuacao jsonb not null default '{"atendimento":1,"atendimento_concluido":2,"novo_cliente":3,"prospeccao":2,"visita":2,"retorno":1}'::jsonb,
  rotina jsonb not null default '{}'::jsonb,
  retencao_meses int not null default 24,
  atualizado_em timestamptz not null default now()
);
insert into public.maisbb_config (id) values (1) on conflict (id) do nothing;

-- 3) BIBLIOTECA DE PRODUTOS E SERVIÇOS (cadastrada pelo administrador) ---------
create table if not exists public.maisbb_servicos (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  nome text not null,
  descricao text, publico text, finalidade text, requisitos text, documentos text,
  condicoes text, faq text, orientacoes text, canal_oficial text,
  fonte text,                       -- de onde veio a informação oficial
  verificado_em date,               -- quando foi conferida
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- 4) PÚBLICOS (categorias novas e ajustes das categorias do sistema) ----------
create table if not exists public.maisbb_publicos (
  chave text primary key,
  grupo text not null,
  nome text not null,
  conteudo jsonb not null default '{}'::jsonb,
  personalizado boolean not null default true,
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now()
);

-- 5) CRM — CLIENTES -------------------------------------------------------------
create table if not exists public.maisbb_clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text,
  cpf_digitos text generated always as (nullif(regexp_replace(coalesce(cpf, ''), '\D', '', 'g'), '')) stored,
  telefone text,
  whatsapp text,
  zap_digitos text generated always as (nullif(right(regexp_replace(coalesce(whatsapp, telefone, ''), '\D', '', 'g'), 11), '')) stored,
  email text,
  endereco text,
  categoria text,
  origem text,
  responsavel uuid references public.maisbb_usuarios(id) on delete set null,
  observacoes text,
  interesses text[] not null default '{}',
  proximo_contato date,
  oportunidade text not null default 'nova' check (oportunidade in ('nova','interessado','em_atendimento','convertida','sem_interesse')),
  consentimento boolean not null default false,
  nao_contatar boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index if not exists maisbb_clientes_cpf_uk on public.maisbb_clientes (cpf_digitos) where cpf_digitos is not null;
create index if not exists maisbb_clientes_zap_idx on public.maisbb_clientes (zap_digitos);

-- 6) ATENDIMENTOS (número automático) -----------------------------------------
create sequence if not exists public.maisbb_atendimento_seq;
create table if not exists public.maisbb_atendimentos (
  id uuid primary key default gen_random_uuid(),
  numero bigint not null default nextval('public.maisbb_atendimento_seq') unique,
  data date not null default (now() at time zone 'America/Sao_Paulo')::date,
  hora time not null default (now() at time zone 'America/Sao_Paulo')::time,
  atendente uuid references public.maisbb_usuarios(id) on delete set null,
  cliente_id uuid references public.maisbb_clientes(id) on delete set null,
  cliente_nome text,
  categoria text not null default 'orientacao',
  servico text,
  servico_id uuid references public.maisbb_servicos(id) on delete set null,
  descricao text,
  resultado text not null default 'concluido' check (resultado in ('concluido','orientado','encaminhado','aguardando','nao_concluido')),
  status text not null default 'fechado' check (status in ('aberto','fechado')),
  observacoes text,
  campanha_id uuid,
  criado_em timestamptz not null default now()
);
create index if not exists maisbb_atend_data_idx on public.maisbb_atendimentos (data desc);

-- 7) PROSPECÇÃO -----------------------------------------------------------------
create table if not exists public.maisbb_prospeccoes (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  publico text,
  objetivo text,
  servico text,
  local text,
  tipo text not null default 'presencial' check (tipo in ('presencial','whatsapp','telefone','redes','evento','visita','parceria')),
  responsavel uuid references public.maisbb_usuarios(id) on delete set null,
  meta int,
  contatos int not null default 0,
  interessados int not null default 0,
  cliente_id uuid references public.maisbb_clientes(id) on delete set null,
  local_id uuid,
  campanha_id uuid,
  resultado text,
  proximo_passo text,
  proximo_contato date,
  status text not null default 'planejada' check (status in ('planejada','realizada','retorno','encerrada')),
  criado_em timestamptz not null default now()
);

-- 8) RADAR DE OPORTUNIDADES DE IVATUBA (estabelecimentos e organizações) ------
create table if not exists public.maisbb_locais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null,
  endereco text,
  contato text,                     -- responsável pelo contato (com autorização)
  telefone_comercial text,
  data_visita date,
  objetivo text,
  resultado text,
  proxima_acao text,
  proxima_data date,
  status text not null default 'a_visitar' check (status in ('a_visitar','visitado','parceiro','sem_interesse')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- 9) CAMPANHAS, MARKETING E CALENDÁRIO -----------------------------------------
create table if not exists public.maisbb_campanhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'comercial' check (tipo in ('comercial','divulgacao')),
  publico text,
  servico text,
  objetivo text,
  descricao text,
  mensagens text,
  inicio date,
  fim date,
  meta int,
  status text not null default 'planejada' check (status in ('planejada','ativa','concluida')),
  criado_em timestamptz not null default now()
);
create table if not exists public.maisbb_publicacoes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  formato text not null default 'post' check (formato in ('post','story','status','banner','comunicado')),
  texto text,
  legenda text,
  data date,
  campanha_id uuid references public.maisbb_campanhas(id) on delete set null,
  publicado boolean not null default false,
  modelo boolean not null default false,
  criado_em timestamptz not null default now()
);
create table if not exists public.maisbb_calendario (
  mes int primary key check (mes between 1 and 12),
  conteudo jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);
create table if not exists public.maisbb_datas (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  titulo text not null,
  descricao text,
  repete boolean not null default true
);
create table if not exists public.maisbb_plano (
  data date primary key,
  conteudo jsonb not null default '{}'::jsonb,
  resultado text,
  realizado int,
  concluido boolean not null default false,
  atualizado_em timestamptz not null default now()
);

-- 10) AGENDA E TAREFAS ------------------------------------------------------------
create table if not exists public.maisbb_tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'pendencia' check (tipo in ('retorno','visita','prospeccao','pendencia','lembrete')),
  prioridade text not null default 'media' check (prioridade in ('alta','media','baixa')),
  data date not null default (now() at time zone 'America/Sao_Paulo')::date,
  hora time,
  cliente_id uuid references public.maisbb_clientes(id) on delete cascade,
  local_id uuid references public.maisbb_locais(id) on delete cascade,
  responsavel uuid references public.maisbb_usuarios(id) on delete set null,
  observacao text,
  concluida boolean not null default false,
  concluida_em timestamptz,
  criado_em timestamptz not null default now()
);

-- 11) METAS -----------------------------------------------------------------------
create table if not exists public.maisbb_metas (
  id uuid primary key default gen_random_uuid(),
  indicador text not null check (indicador in ('atendimentos','novos_clientes','prospeccoes','visitas','retornos','campanhas','interessados')),
  periodo text not null default 'mes' check (periodo in ('dia','semana','mes')),
  alvo int not null,
  usuario_id uuid references public.maisbb_usuarios(id) on delete cascade,   -- null = meta da equipe
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- 12) DESAFIO DO MÊS E SORTEIOS (auditáveis) -------------------------------------
create table if not exists public.maisbb_desafios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  premio text,
  imagem_path text,
  inicio date, fim date,
  regras text,
  pontuacao jsonb not null default '{}'::jsonb,
  data_sorteio date,
  pontos_minimos int not null default 1,
  conformidade_ok boolean not null default false,   -- admin confirma que validou as regras/legalidade
  status text not null default 'aberto' check (status in ('aberto','encerrado','sorteado')),
  criado_em timestamptz not null default now()
);
create table if not exists public.maisbb_participantes (
  id uuid primary key default gen_random_uuid(),
  desafio_id uuid not null references public.maisbb_desafios(id) on delete cascade,
  nome text not null,
  referencia text,
  usuario_id uuid references public.maisbb_usuarios(id) on delete set null,
  pontos int not null default 0,
  elegivel boolean not null default true,
  criado_em timestamptz not null default now()
);
create table if not exists public.maisbb_sorteios (
  id uuid primary key default gen_random_uuid(),
  desafio_id uuid not null references public.maisbb_desafios(id) on delete cascade,
  protocolo text not null unique,
  semente text not null,
  hash_lista text not null,
  participantes jsonb not null,
  ganhador_nome text not null,
  ganhador_id uuid,
  realizado_por uuid default auth.uid(),
  realizado_em timestamptz not null default now()
);
-- sorteios não podem ser alterados nem apagados (auditoria)
create or replace function public.maisbb_sorteio_imutavel() returns trigger language plpgsql as $$
begin raise exception 'Registro de sorteio não pode ser alterado nem excluído.'; end $$;
drop trigger if exists maisbb_sorteio_imutavel on public.maisbb_sorteios;
create trigger maisbb_sorteio_imutavel before update or delete on public.maisbb_sorteios for each row execute function public.maisbb_sorteio_imutavel();

-- 13) DICAS, CONHECIMENTO DO ASSISTENTE E TREINAMENTO -----------------------------
create table if not exists public.maisbb_dicas (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  texto text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create table if not exists public.maisbb_conhecimento (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  conteudo text not null,
  tags text,
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now()
);
create table if not exists public.maisbb_treino_resultados (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.maisbb_usuarios(id) on delete cascade,
  modulo text not null,
  acertos int not null,
  total int not null,
  criado_em timestamptz not null default now()
);

-- 14) REGISTRO DE ALTERAÇÕES (auditoria) --------------------------------------------
create table if not exists public.maisbb_auditoria (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro text,
  acao text not null,
  usuario uuid default auth.uid(),
  dados jsonb,
  em timestamptz not null default now()
);
create or replace function public.maisbb_auditar() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  r := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  r := r - 'cpf';   -- não copia CPF para o log
  insert into maisbb_auditoria (tabela, registro, acao, dados)
  values (tg_table_name, coalesce(r->>'id', r->>'data', r->>'mes', r->>'chave'), lower(tg_op), r);
  return coalesce(new, old);
end $$;

create or replace function public.maisbb_touch() returns trigger language plpgsql as $$
begin new.atualizado_em := now(); return new; end $$;

-- 15) SEGURANÇA (RLS) ----------------------------------------------------------------
do $$
declare t text;
  equipe text[] := array['maisbb_clientes','maisbb_atendimentos','maisbb_prospeccoes','maisbb_locais','maisbb_tarefas',
                         'maisbb_plano','maisbb_publicacoes','maisbb_treino_resultados','maisbb_campanhas'];
  admin_escreve text[] := array['maisbb_servicos','maisbb_publicos','maisbb_calendario','maisbb_datas','maisbb_metas',
                         'maisbb_desafios','maisbb_participantes','maisbb_dicas','maisbb_conhecimento','maisbb_config','maisbb_convites','maisbb_usuarios'];
begin
  foreach t in array equipe || admin_escreve || array['maisbb_sorteios','maisbb_auditoria'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('drop policy if exists "maisbb ler" on public.%I', t);
    execute format('drop policy if exists "maisbb escrever" on public.%I', t);
    execute format('drop policy if exists "maisbb inserir" on public.%I', t);
  end loop;
  foreach t in array equipe loop
    execute format('create policy "maisbb ler" on public.%I for select to authenticated using (public.maisbb_acesso())', t);
    execute format('create policy "maisbb escrever" on public.%I for all to authenticated using (public.maisbb_acesso()) with check (public.maisbb_acesso())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
  foreach t in array admin_escreve loop
    execute format('create policy "maisbb ler" on public.%I for select to authenticated using (public.maisbb_acesso())', t);
    execute format('create policy "maisbb escrever" on public.%I for all to authenticated using (public.maisbb_admin()) with check (public.maisbb_admin())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
  -- sorteios: todos leem, só admin insere (sem update/delete)
  execute 'create policy "maisbb ler" on public.maisbb_sorteios for select to authenticated using (public.maisbb_acesso())';
  execute 'create policy "maisbb inserir" on public.maisbb_sorteios for insert to authenticated with check (public.maisbb_admin())';
  execute 'grant select, insert on public.maisbb_sorteios to authenticated';
  -- auditoria: só admin lê; gravada por trigger
  execute 'create policy "maisbb ler" on public.maisbb_auditoria for select to authenticated using (public.maisbb_admin())';
  execute 'grant select on public.maisbb_auditoria to authenticated';
  -- triggers de auditoria e atualização
  foreach t in array array['maisbb_clientes','maisbb_atendimentos','maisbb_prospeccoes','maisbb_locais','maisbb_servicos','maisbb_campanhas',
                           'maisbb_metas','maisbb_desafios','maisbb_participantes','maisbb_usuarios','maisbb_convites','maisbb_config','maisbb_publicos','maisbb_conhecimento'] loop
    execute format('drop trigger if exists maisbb_auditar on public.%I', t);
    execute format('create trigger maisbb_auditar after insert or update or delete on public.%I for each row execute function public.maisbb_auditar()', t);
  end loop;
  foreach t in array array['maisbb_clientes','maisbb_locais','maisbb_servicos','maisbb_config','maisbb_publicos','maisbb_conhecimento','maisbb_calendario','maisbb_plano'] loop
    execute format('drop trigger if exists maisbb_touch on public.%I', t);
    execute format('create trigger maisbb_touch before update on public.%I for each row execute function public.maisbb_touch()', t);
  end loop;
end $$;
grant usage, select on sequence public.maisbb_atendimento_seq to authenticated;

-- 16) ARQUIVOS (logo, imagens de prêmios e artes) -----------------------------------
insert into storage.buckets (id, name, public, file_size_limit) values ('maisbb', 'maisbb', true, 10485760)
on conflict (id) do update set public = true;
drop policy if exists "maisbb arquivos ler" on storage.objects;
create policy "maisbb arquivos ler" on storage.objects for select using (bucket_id = 'maisbb');
drop policy if exists "maisbb arquivos enviar" on storage.objects;
create policy "maisbb arquivos enviar" on storage.objects for insert to authenticated with check (bucket_id = 'maisbb' and public.maisbb_acesso());
drop policy if exists "maisbb arquivos apagar" on storage.objects;
create policy "maisbb arquivos apagar" on storage.objects for delete to authenticated using (bucket_id = 'maisbb' and public.maisbb_admin());

-- 17) RETENÇÃO (LGPD): apaga clientes sem movimento além do prazo configurado (rodar pelo painel)
create or replace function public.maisbb_aplicar_retencao() returns int
language plpgsql security definer set search_path = public as $$
declare n int; meses int;
begin
  if not public.maisbb_admin() then raise exception 'Somente administrador.'; end if;
  select retencao_meses into meses from maisbb_config where id = 1;
  delete from maisbb_clientes c
   where c.atualizado_em < now() - make_interval(months => meses)
     and not exists (select 1 from maisbb_atendimentos a where a.cliente_id = c.id and a.criado_em > now() - make_interval(months => meses));
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.maisbb_aplicar_retencao() to authenticated;

select string_agg(table_name, ', ' order by table_name) as tabelas_mais_bb
  from information_schema.tables where table_schema = 'public' and table_name like 'maisbb_%';
