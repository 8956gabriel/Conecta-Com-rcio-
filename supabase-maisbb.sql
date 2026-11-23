-- =============================================================================
-- MAIS BB DIGITAL — Inteligência Comercial e Atendimento
-- Ferramenta independente de apoio à atendente do Mais BB Correspondente
-- Autorizado de Ivatuba-PR. NÃO é sistema oficial do Banco do Brasil, não faz
-- operações bancárias e não guarda senhas, tokens, cartões ou credenciais.
--
-- Usa o mesmo Supabase do Conecta Comércio (mesmas contas de login), com
-- tabelas próprias (prefixo maisbb_) e permissões separadas.
-- Pode ser rodado de novo sem estragar nada.
-- =============================================================================

-- ---------------------------------------------------------------- EQUIPE E ACESSO
create table if not exists public.maisbb_membros (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text,
  papel text not null default 'atendente' check (papel in ('admin','atendente')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create table if not exists public.maisbb_convites (
  email text primary key,
  nome text,
  papel text not null default 'atendente' check (papel in ('admin','atendente')),
  criado_em timestamptz not null default now()
);

create or replace function public.maisbb_papel()
returns text language sql stable security definer set search_path = public as $$
  select papel from public.maisbb_membros where user_id = auth.uid() and ativo
$$;
create or replace function public.maisbb_pode_acessar()
returns boolean language sql stable security definer set search_path = public as $$
  select public.maisbb_papel() is not null
$$;
create or replace function public.maisbb_e_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.maisbb_papel() = 'admin', false)
$$;

-- Entrada: o primeiro usuário vira administrador; depois, só quem foi convidado.
create or replace function public.maisbb_entrar()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_email text; v_conv maisbb_convites%rowtype; v_nome text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'motivo', 'sem_login'); end if;
  if exists (select 1 from maisbb_membros where user_id = auth.uid()) then
    return (select jsonb_build_object('ok', ativo, 'papel', papel, 'nome', nome, 'motivo', case when ativo then null else 'inativo' end) from maisbb_membros where user_id = auth.uid());
  end if;
  select lower(email), coalesce(raw_user_meta_data->>'nome', raw_user_meta_data->>'full_name', split_part(email, '@', 1))
    into v_email, v_nome from auth.users where id = auth.uid();
  if not exists (select 1 from maisbb_membros) then
    insert into maisbb_membros (user_id, nome, email, papel) values (auth.uid(), v_nome, v_email, 'admin');
    return jsonb_build_object('ok', true, 'papel', 'admin', 'nome', v_nome, 'primeiro', true);
  end if;
  select * into v_conv from maisbb_convites where lower(email) = v_email;
  if found then
    insert into maisbb_membros (user_id, nome, email, papel) values (auth.uid(), coalesce(v_conv.nome, v_nome), v_email, v_conv.papel);
    delete from maisbb_convites where lower(email) = v_email;
    return jsonb_build_object('ok', true, 'papel', v_conv.papel, 'nome', coalesce(v_conv.nome, v_nome));
  end if;
  return jsonb_build_object('ok', false, 'motivo', 'sem_convite', 'email', v_email);
end $$;
grant execute on function public.maisbb_entrar(), public.maisbb_papel(), public.maisbb_pode_acessar(), public.maisbb_e_admin() to authenticated;

-- ---------------------------------------------------------------- CONFIGURAÇÃO
create table if not exists public.maisbb_config (
  id int primary key default 1 check (id = 1),
  nome_correspondente text default 'Mais BB Correspondente Autorizado',
  cidade text default 'Ivatuba-PR',
  endereco text,
  horario text,
  whatsapp text,
  logo_url text,
  pontuacao jsonb not null default '{"atendimento":1,"atendimento_concluido":2,"novo_cliente":3,"prospeccao":1,"visita":2,"retorno":1}'::jsonb,
  rotina jsonb,
  calendario jsonb not null default '{}'::jsonb,    -- ajustes do calendário anual e das datas
  atualizado_em timestamptz not null default now()
);
insert into public.maisbb_config (id) values (1) on conflict (id) do nothing;
alter table public.maisbb_config add column if not exists calendario jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------- BIBLIOTECA DE SERVIÇOS (só o que for autorizado ao correspondente)
create table if not exists public.maisbb_servicos (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  nome text not null,
  descricao text,
  publico text,
  finalidade text,
  requisitos text,
  documentos text,
  condicoes text,
  faq text,
  orientacoes text,
  canal_oficial text,
  fonte_url text,
  confirmado boolean not null default false,       -- conferido no contrato/portal oficial do correspondente
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------- PÚBLICOS (os padrões ficam no sistema; aqui ficam os novos e os ajustes)
create table if not exists public.maisbb_publicos (
  chave text primary key,
  grupo text not null,
  nome text not null,
  conteudo jsonb not null default '{}'::jsonb,     -- perfil, necessidades, onde, conversa, perguntas, apresentacao, faq, mensagens, acompanhamento, campanhas, meta
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------- CRM
create table if not exists public.maisbb_clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text,                                         -- só quando necessário
  cpf_digitos text generated always as (nullif(regexp_replace(coalesce(cpf, ''), '\D', '', 'g'), '')) stored,
  telefone text,
  whatsapp text,
  zap_digitos text generated always as (nullif(right(regexp_replace(coalesce(whatsapp, telefone, ''), '\D', '', 'g'), 11), '')) stored,
  email text,
  endereco text,
  publico text,                                     -- chave do público (categoria)
  origem text,
  responsavel uuid default auth.uid(),
  observacoes text,
  interesses text[] not null default '{}',
  proximo_contato date,
  oportunidade text not null default 'nova' check (oportunidade in ('nova','interessado','acompanhamento','atendido','sem_interesse')),
  nao_contatar boolean not null default false,       -- pediu para não receber contato
  consentimento boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index if not exists maisbb_clientes_cpf_uk on public.maisbb_clientes (cpf_digitos) where cpf_digitos is not null;
create index if not exists maisbb_clientes_zap_idx on public.maisbb_clientes (zap_digitos);

create sequence if not exists public.maisbb_atendimento_seq;
create table if not exists public.maisbb_atendimentos (
  id uuid primary key default gen_random_uuid(),
  numero bigint not null default nextval('public.maisbb_atendimento_seq') unique,
  data date not null default current_date,
  hora time not null default (now() at time zone 'America/Sao_Paulo')::time,
  atendente uuid not null default auth.uid(),
  cliente_id uuid references public.maisbb_clientes(id) on delete set null,
  cliente_nome text,
  categoria text not null check (categoria in ('bancario','pagamentos','credito','financiamento','orientacao','pf','pj','rural','documentacao','outros')),
  servico_id uuid references public.maisbb_servicos(id) on delete set null,
  servico_texto text,
  descricao text,
  resultado text not null default 'concluido' check (resultado in ('concluido','orientado','encaminhado','aguardando','nao_concluido')),
  status text not null default 'finalizado' check (status in ('aberto','em_andamento','finalizado')),
  satisfacao int check (satisfacao between 1 and 5),
  observacoes text,
  criado_em timestamptz not null default now()
);
create index if not exists maisbb_atend_data_idx on public.maisbb_atendimentos (data desc);

create table if not exists public.maisbb_prospeccoes (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  publico text,
  objetivo text,
  servico_id uuid references public.maisbb_servicos(id) on delete set null,
  local text,
  tipo text not null default 'presencial' check (tipo in ('presencial','whatsapp','telefone','redes','evento','visita','parceria')),
  responsavel uuid default auth.uid(),
  meta int,
  cliente_id uuid references public.maisbb_clientes(id) on delete set null,
  contato_nome text,
  contatos_feitos int not null default 0,
  resultado text,
  proximo_passo text,
  retorno_em date,
  status text not null default 'planejada' check (status in ('planejada','realizada','retorno','convertida','sem_interesse')),
  campanha_id uuid,
  criado_em timestamptz not null default now()
);

-- Radar de oportunidades de Ivatuba (organizações; sem dados pessoais de terceiros sem base legal)
create table if not exists public.maisbb_locais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null check (categoria in ('comercio','empresa','escola','escritorio','servicos','associacao','comunidade','rural','evento','grupo')),
  endereco text,
  contato text,                                     -- responsável pelo contato (comercial)
  data_visita date,
  objetivo text,
  resultado text,
  proxima_acao text,
  proxima_data date,
  status text not null default 'a_visitar' check (status in ('a_visitar','visitado','acompanhamento','parceria','sem_interesse')),
  responsavel uuid default auth.uid(),
  criado_em timestamptz not null default now()
);

create table if not exists public.maisbb_tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'lembrete' check (tipo in ('retorno','visita','prospeccao','pendencia','lembrete','campanha')),
  data date not null default current_date,
  hora time,
  prioridade text not null default 'media' check (prioridade in ('alta','media','baixa')),
  concluida boolean not null default false,
  concluida_em timestamptz,
  responsavel uuid default auth.uid(),
  cliente_id uuid references public.maisbb_clientes(id) on delete cascade,
  local_id uuid references public.maisbb_locais(id) on delete cascade,
  observacao text,
  criado_em timestamptz not null default now()
);

create table if not exists public.maisbb_campanhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  objetivo text,
  publico text,
  servicos text,
  inicio date,
  fim date,
  acoes text,
  mensagens text,
  artes text,
  metas text,
  status text not null default 'planejada' check (status in ('planejada','ativa','concluida','arquivada')),
  criado_em timestamptz not null default now()
);
do $$ begin
  alter table public.maisbb_prospeccoes add constraint maisbb_prosp_camp_fk foreign key (campanha_id) references public.maisbb_campanhas(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.maisbb_marketing (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('post','story','status','banner','comunicado','arte')),
  titulo text not null,
  texto text,
  imagem_url text,
  data_publicacao date,
  status text not null default 'rascunho' check (status in ('rascunho','agendado','publicado')),
  campanha_id uuid references public.maisbb_campanhas(id) on delete set null,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------- METAS, DIA A DIA, INCENTIVOS
create table if not exists public.maisbb_metas (
  id uuid primary key default gen_random_uuid(),
  indicador text not null check (indicador in ('atendimentos','novos_clientes','prospeccoes','visitas','retornos','campanhas','interessados')),
  periodo text not null check (periodo in ('dia','semana','mes')),
  alvo int not null check (alvo > 0),
  atendente uuid references public.maisbb_membros(user_id) on delete cascade,   -- vazio = meta de cada atendente
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.maisbb_dias (
  data date not null,
  user_id uuid not null default auth.uid(),
  status text not null default 'pendente' check (status in ('pendente','iniciada','concluida')),
  resultado text,
  ajustes jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  primary key (data, user_id)
);

create table if not exists public.maisbb_desafios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  premio text,
  imagem_url text,
  inicio date not null,
  fim date not null,
  regras text,
  pontuacao jsonb not null default '{"atendimento":1,"atendimento_concluido":2,"novo_cliente":3,"prospeccao":1,"visita":2,"retorno":1}'::jsonb,
  pontos_minimos int not null default 1,
  modo text not null default 'pontos' check (modo in ('pontos','igual')),   -- pontos = cada ponto vale um número no sorteio
  data_sorteio date,
  conformidade_confirmada boolean not null default false,
  status text not null default 'ativo' check (status in ('rascunho','ativo','encerrado','sorteado')),
  criado_em timestamptz not null default now()
);

create table if not exists public.maisbb_sorteios (
  id uuid primary key default gen_random_uuid(),
  desafio_id uuid not null references public.maisbb_desafios(id) on delete cascade,
  protocolo text not null unique,
  realizado_em timestamptz not null default now(),
  realizado_por uuid default auth.uid(),
  participantes jsonb not null,                     -- [{user_id, nome, pontos, bilhetes, de, ate}]
  total_bilhetes int not null,
  bilhete_sorteado int not null,
  ganhador_id uuid,
  ganhador_nome text,
  hash_participantes text not null
);

-- Pontos de cada atendente num período (atendimentos, clientes, prospecções, visitas, retornos)
create or replace function public.maisbb_pontos(p_inicio date, p_fim date, p_pesos jsonb)
returns table (user_id uuid, nome text, atendimentos int, concluidos int, novos_clientes int, prospeccoes int, visitas int, retornos int, pontos int)
language sql stable security definer set search_path = public as $$
  select m.user_id, m.nome,
    (select count(*) from maisbb_atendimentos a where a.atendente = m.user_id and a.data between p_inicio and p_fim)::int,
    (select count(*) from maisbb_atendimentos a where a.atendente = m.user_id and a.data between p_inicio and p_fim and a.resultado = 'concluido')::int,
    (select count(*) from maisbb_clientes c where c.responsavel = m.user_id and c.criado_em::date between p_inicio and p_fim)::int,
    (select count(*) from maisbb_prospeccoes p where p.responsavel = m.user_id and p.data between p_inicio and p_fim and p.status <> 'planejada')::int,
    (select count(*) from maisbb_locais l where l.responsavel = m.user_id and l.data_visita between p_inicio and p_fim)::int,
    (select count(*) from maisbb_tarefas t where t.responsavel = m.user_id and t.tipo = 'retorno' and t.concluida and t.concluida_em::date between p_inicio and p_fim)::int,
    0
  from maisbb_membros m where m.ativo and public.maisbb_pode_acessar()
$$;

-- Sorteio auditável: lista congelada dos elegíveis + hash + bilhete sorteado + protocolo
create or replace function public.maisbb_sortear(p_desafio uuid)
returns public.maisbb_sorteios language plpgsql security definer set search_path = public as $$
declare d maisbb_desafios%rowtype; lista jsonb := '[]'::jsonb; total int := 0; r record; pts int; bil int; sorteado int; w jsonb; ganh jsonb; s maisbb_sorteios%rowtype;
begin
  if not public.maisbb_e_admin() then raise exception 'Somente o administrador pode realizar o sorteio.'; end if;
  select * into d from maisbb_desafios where id = p_desafio for update;
  if not found then raise exception 'Desafio não encontrado.'; end if;
  if not d.conformidade_confirmada then raise exception 'Confirme que as regras e a conformidade legal foram validadas antes do sorteio.'; end if;
  if exists (select 1 from maisbb_sorteios where desafio_id = p_desafio) then raise exception 'Este desafio já foi sorteado.'; end if;
  for r in select * from public.maisbb_pontos(d.inicio, d.fim, d.pontuacao) order by nome, user_id loop
    w := d.pontuacao;
    pts := r.atendimentos * coalesce((w->>'atendimento')::int, 0) + r.concluidos * coalesce((w->>'atendimento_concluido')::int, 0)
         + r.novos_clientes * coalesce((w->>'novo_cliente')::int, 0) + r.prospeccoes * coalesce((w->>'prospeccao')::int, 0)
         + r.visitas * coalesce((w->>'visita')::int, 0) + r.retornos * coalesce((w->>'retorno')::int, 0);
    if pts >= d.pontos_minimos then
      bil := case when d.modo = 'igual' then 1 else pts end;
      lista := lista || jsonb_build_object('user_id', r.user_id, 'nome', r.nome, 'pontos', pts, 'bilhetes', bil, 'de', total + 1, 'ate', total + bil);
      total := total + bil;
    end if;
  end loop;
  if total = 0 then raise exception 'Nenhum participante elegível (pontuação mínima não atingida).'; end if;
  sorteado := 1 + floor(random() * total)::int;
  select e into ganh from jsonb_array_elements(lista) e where (e->>'de')::int <= sorteado and (e->>'ate')::int >= sorteado limit 1;
  insert into maisbb_sorteios (desafio_id, protocolo, participantes, total_bilhetes, bilhete_sorteado, ganhador_id, ganhador_nome, hash_participantes)
  values (p_desafio, 'MBB-' || to_char(now() at time zone 'America/Sao_Paulo', 'YYYYMMDD-HH24MISS') || '-' || upper(substr(md5(random()::text), 1, 6)),
          lista, total, sorteado, (ganh->>'user_id')::uuid, ganh->>'nome', md5(lista::text))
  returning * into s;
  update maisbb_desafios set status = 'sorteado' where id = p_desafio;
  return s;
end $$;
grant execute on function public.maisbb_pontos(date, date, jsonb), public.maisbb_sortear(uuid) to authenticated;

-- ---------------------------------------------------------------- CONHECIMENTO, DICAS E TREINAMENTO
create table if not exists public.maisbb_conhecimento (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  conteudo text not null,
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now()
);
create table if not exists public.maisbb_dicas (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  texto text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create table if not exists public.maisbb_treinamentos (
  id uuid primary key default gen_random_uuid(),
  modulo text not null,
  titulo text not null,
  conteudo text,
  quiz jsonb not null default '[]'::jsonb,           -- [{p, ops:[...], c: indice_correto}]
  ordem int,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create table if not exists public.maisbb_progresso (
  user_id uuid not null default auth.uid(),
  chave text not null,                               -- treinamento padrão (texto) ou id de treinamento do admin
  acertos int not null default 0,
  total int not null default 0,
  concluido_em timestamptz not null default now(),
  primary key (user_id, chave)
);

-- ---------------------------------------------------------------- REGISTRO DE ALTERAÇÕES
create table if not exists public.maisbb_log (
  id bigserial primary key,
  tabela text not null,
  registro text,
  acao text not null,
  usuario uuid default auth.uid(),
  quando timestamptz not null default now(),
  antes jsonb,
  depois jsonb
);
create or replace function public.maisbb_registrar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into maisbb_log (tabela, registro, acao, antes, depois)
  values (tg_table_name, coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'id', (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'user_id'),
          lower(tg_op),
          case when tg_op <> 'INSERT' then to_jsonb(old) - 'cpf' end,
          case when tg_op <> 'DELETE' then to_jsonb(new) - 'cpf' end);
  return coalesce(new, old);
end $$;
create or replace function public.maisbb_touch()
returns trigger language plpgsql as $$ begin new.atualizado_em := now(); return new; end $$;

-- ---------------------------------------------------------------- SEGURANÇA (RLS)
do $$
declare t text;
  -- tabelas que toda a equipe edita
  equipe text[] := array['maisbb_clientes','maisbb_atendimentos','maisbb_prospeccoes','maisbb_locais','maisbb_tarefas','maisbb_marketing','maisbb_campanhas'];
  -- tabelas que a equipe lê e só o administrador altera
  admin text[] := array['maisbb_config','maisbb_servicos','maisbb_publicos','maisbb_metas','maisbb_desafios','maisbb_conhecimento','maisbb_dicas','maisbb_treinamentos'];
begin
  foreach t in array equipe || admin || array['maisbb_membros','maisbb_convites','maisbb_sorteios','maisbb_dias','maisbb_progresso','maisbb_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('drop policy if exists "maisbb ler" on public.%I', t);
    execute format('drop policy if exists "maisbb escrever" on public.%I', t);
  end loop;
  foreach t in array equipe loop
    execute format('create policy "maisbb ler" on public.%I for select to authenticated using (public.maisbb_pode_acessar())', t);
    execute format('create policy "maisbb escrever" on public.%I for all to authenticated using (public.maisbb_pode_acessar()) with check (public.maisbb_pode_acessar())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
  foreach t in array admin loop
    execute format('create policy "maisbb ler" on public.%I for select to authenticated using (public.maisbb_pode_acessar())', t);
    execute format('create policy "maisbb escrever" on public.%I for all to authenticated using (public.maisbb_e_admin()) with check (public.maisbb_e_admin())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
  -- equipe: todos veem a equipe; só o admin altera
  create policy "maisbb ler" on public.maisbb_membros for select to authenticated using (public.maisbb_pode_acessar());
  create policy "maisbb escrever" on public.maisbb_membros for all to authenticated using (public.maisbb_e_admin()) with check (public.maisbb_e_admin());
  create policy "maisbb ler" on public.maisbb_convites for select to authenticated using (public.maisbb_e_admin());
  create policy "maisbb escrever" on public.maisbb_convites for all to authenticated using (public.maisbb_e_admin()) with check (public.maisbb_e_admin());
  create policy "maisbb ler" on public.maisbb_sorteios for select to authenticated using (public.maisbb_pode_acessar());
  create policy "maisbb ler" on public.maisbb_log for select to authenticated using (public.maisbb_e_admin());
  -- dia a dia e treinamento: cada atendente cuida do seu; admin vê tudo
  create policy "maisbb ler" on public.maisbb_dias for select to authenticated using (user_id = auth.uid() or public.maisbb_e_admin());
  create policy "maisbb escrever" on public.maisbb_dias for all to authenticated using (user_id = auth.uid() and public.maisbb_pode_acessar()) with check (user_id = auth.uid() and public.maisbb_pode_acessar());
  create policy "maisbb ler" on public.maisbb_progresso for select to authenticated using (user_id = auth.uid() or public.maisbb_e_admin());
  create policy "maisbb escrever" on public.maisbb_progresso for all to authenticated using (user_id = auth.uid() and public.maisbb_pode_acessar()) with check (user_id = auth.uid() and public.maisbb_pode_acessar());
  grant select, insert, update, delete on public.maisbb_membros, public.maisbb_convites, public.maisbb_dias, public.maisbb_progresso to authenticated;
  grant select on public.maisbb_sorteios, public.maisbb_log to authenticated;
  grant usage on sequence public.maisbb_atendimento_seq to authenticated;

  foreach t in array array['maisbb_clientes','maisbb_atendimentos','maisbb_prospeccoes','maisbb_locais','maisbb_servicos','maisbb_membros','maisbb_config','maisbb_metas','maisbb_desafios','maisbb_campanhas','maisbb_publicos','maisbb_conhecimento'] loop
    execute format('drop trigger if exists maisbb_log on public.%I', t);
    execute format('create trigger maisbb_log after insert or update or delete on public.%I for each row execute function public.maisbb_registrar()', t);
  end loop;
  foreach t in array array['maisbb_clientes','maisbb_servicos','maisbb_config','maisbb_publicos','maisbb_conhecimento','maisbb_dias'] loop
    execute format('drop trigger if exists maisbb_touch on public.%I', t);
    execute format('create trigger maisbb_touch before update on public.%I for each row execute function public.maisbb_touch()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- ARQUIVOS (logo, artes, imagens de prêmios)
insert into storage.buckets (id, name, public, file_size_limit) values ('maisbb', 'maisbb', true, 10485760)
on conflict (id) do update set public = true, file_size_limit = 10485760;
drop policy if exists "maisbb arquivos enviar" on storage.objects;
create policy "maisbb arquivos enviar" on storage.objects for insert to authenticated with check (bucket_id = 'maisbb' and public.maisbb_pode_acessar());
drop policy if exists "maisbb arquivos apagar" on storage.objects;
create policy "maisbb arquivos apagar" on storage.objects for delete to authenticated using (bucket_id = 'maisbb' and public.maisbb_e_admin());

select string_agg(table_name, ', ' order by table_name) as tabelas_mais_bb
  from information_schema.tables where table_schema = 'public' and table_name like 'maisbb_%';
