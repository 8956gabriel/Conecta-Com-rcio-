-- =============================================================================
-- CONECTA COMÉRCIO — MÓDULO FOMENTO PARANÁ (Ivatuba)
-- Rode este arquivo UMA VEZ no SQL Editor do Supabase (projeto conecta-comercio).
--
-- • Só CRIA coisas novas (tabelas fomento_*, funções e políticas). Não apaga,
--   não altera nem renomeia nenhuma tabela existente — inclusive a antiga
--   fomento_leads e o bucket documentos-fomento continuam como estão.
-- • Pode ser rodado de novo sem estragar nada (usa "if not exists" / "or replace").
-- • Usa a mesma autenticação (auth.users) e a mesma tabela perfis do Conecta
--   Comércio — nenhum cadastro de usuário é duplicado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) PERMISSÕES ESPECÍFICAS DO MÓDULO
--    Quem pode entrar na área administrativa do Fomento:
--      • qualquer perfil "admin" do Conecta Comércio, ou
--      • um usuário já cadastrado na plataforma e liberado aqui (ex.: Ademir),
--        mesmo que ele NÃO seja admin geral do site.
-- -----------------------------------------------------------------------------
create table if not exists public.fomento_agentes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.perfis(id) on delete set null, -- conta de login (opcional p/ agentes só do ranking)
  nome text not null,
  whatsapp text,
  papel text not null default 'agente' check (papel in ('gestor','agente')), -- gestor: edita linhas/PDFs/config
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Pode acessar o painel? (admin geral OU agente ativo vinculado à conta)
create or replace function public.fomento_pode_acessar()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin')
      or exists (select 1 from public.fomento_agentes a where a.user_id = auth.uid() and a.ativo);
$$;

-- Pode gerir configurações (linhas, materiais, agentes)? (admin geral OU agente "gestor")
create or replace function public.fomento_pode_gerir()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin')
      or exists (select 1 from public.fomento_agentes a where a.user_id = auth.uid() and a.ativo and a.papel = 'gestor');
$$;

-- Usado no painel (Configurações › Equipe) para vincular um agente a uma conta
-- que JÁ existe no Conecta Comércio, pelo e-mail. Só o gestor consegue usar.
create or replace function public.fomento_buscar_usuario(p_email text)
returns uuid language plpgsql stable security definer set search_path = public, auth as $$
declare v uuid;
begin
  if not public.fomento_pode_gerir() then return null; end if;
  select u.id into v from auth.users u
   join public.perfis p on p.id = u.id
   where lower(u.email) = lower(trim(p_email)) limit 1;
  return v;
end $$;
revoke all on function public.fomento_buscar_usuario(text) from public, anon;
grant execute on function public.fomento_buscar_usuario(text) to authenticated;

grant execute on function public.fomento_pode_acessar() to anon, authenticated;
grant execute on function public.fomento_pode_gerir() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2) CONFIGURAÇÃO DO MÓDULO (uma linha só)
-- -----------------------------------------------------------------------------
create table if not exists public.fomento_modulo_config (
  id int primary key default 1 check (id = 1),
  ativo boolean not null default true,              -- mostra a seção pública
  whatsapp_oficial text,                            -- WhatsApp do Agente de Crédito
  agente_nome text default 'Ademir',
  titulo text default 'Fomento Paraná — Crédito para Empreendedores',
  texto_intro text default 'Conheça as linhas de crédito da Fomento Paraná, agência oficial de crédito do Governo do Paraná, com atendimento do Agente de Crédito em Ivatuba.',
  link_oficial text default 'https://www.fomento.pr.gov.br/Linhas-de-Credito',
  aviso_simulacao text default 'Simulação apenas estimativa. Taxas, prazos e valores finais dependem da análise de crédito da Fomento Paraná.',
  atualizado_em timestamptz not null default now()
);
insert into public.fomento_modulo_config (id) values (1) on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 3) LINHAS DE CRÉDITO (as 9 modalidades — tudo editável no painel)
-- -----------------------------------------------------------------------------
create table if not exists public.fomento_linhas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  descricao text,
  finalidade text,
  publico_alvo text,
  taxas text,                    -- texto oficial das taxas (como divulgado pela Fomento)
  prazos text,
  carencia text,
  valores text,                  -- ex.: "De R$ 1 mil a R$ 20 mil"
  requisitos text,
  documentos text[] not null default '{}',
  pdf_url text,                  -- informativo da modalidade
  -- números usados só pelo simulador (estimativa):
  taxa_mensal_ref numeric(6,3),  -- % ao mês
  valor_min numeric(12,2),
  valor_max numeric(12,2),
  prazo_max_meses int,
  carencia_max_meses int,
  cor text default '#0A5AA8',
  ordem int not null default 0,
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now()
);

insert into public.fomento_linhas (slug, nome, descricao, finalidade, publico_alvo, ordem, cor, documentos) values
  ('pesca-nautica', 'Fomento Pesca e Náutica', 'Crédito para quem trabalha com pesca, aquicultura, turismo náutico e atividades ligadas à água.', 'Compra de barcos, motores, equipamentos e capital de giro da atividade.', 'Pescadores, marinas, prestadores de serviços náuticos.', 1, '#0A5AA8', '{}'),
  ('taxista', 'Fomento Taxista', 'Financiamento para taxistas trocarem ou adquirirem o veículo de trabalho.', 'Aquisição de veículo novo ou seminovo para uso como táxi.', 'Taxistas com permissão/alvará ativo.', 2, '#0A5AA8', '{}'),
  ('taxista-mulher', 'Fomento Taxista Mulher', 'Condição especial para mulheres taxistas.', 'Aquisição de veículo para uso como táxi.', 'Mulheres taxistas com permissão/alvará ativo.', 3, '#1E8E5A', '{}'),
  ('micro-emergencial', 'Micro Emergencial', 'Linha de apoio a empreendedores de municípios em situação de emergência ou calamidade.', 'Recompor capital de giro, estoques e equipamentos após eventos adversos.', 'Empreendedores de municípios com decreto de emergência reconhecido.', 4, '#C2410C', '{}'),
  ('micro-facil', 'Micro Fácil', 'Microcrédito ágil para pequenos negócios formais e informais.', 'Capital de giro e investimentos no negócio.', 'MEI, microempresas e empreendedores informais.', 5, '#0A5AA8', '{}'),
  ('micro-mulher', 'Micro Mulher', 'Microcrédito com condições especiais para empreendedoras (Banco da Mulher Paranaense).', 'Capital de giro e investimentos no negócio.', 'Mulheres empreendedoras, formais ou informais.', 6, '#1E8E5A', '{}'),
  ('micro-mulher-rural', 'Micro Mulher Rural', 'Microcrédito para mulheres que empreendem no meio rural.', 'Investimento e capital de giro de atividades rurais.', 'Produtoras rurais e empreendedoras do campo.', 7, '#1E8E5A', '{}'),
  ('micro-rural', 'Micro Rural', 'Microcrédito para pequenos negócios do meio rural.', 'Investimento e capital de giro de atividades rurais.', 'Produtores e empreendedores rurais.', 8, '#3F7D20', '{}'),
  ('recupera-micro', 'Recupera de Micro', 'Linha de recuperação para micro e pequenos negócios.', 'Reorganizar o capital de giro e retomar a atividade.', 'Micro e pequenos empreendedores.', 9, '#0A5AA8', '{}')
on conflict (slug) do nothing;
-- OBS: taxas, prazos, carência, valores e documentos ficam em branco de propósito:
-- o Agente de Crédito preenche com os números oficiais vigentes pelo painel.

-- -----------------------------------------------------------------------------
-- 4) PROPOSTAS (cadastradas pelo agente) + HISTÓRICO
-- -----------------------------------------------------------------------------
create sequence if not exists public.fomento_proposta_seq;

create table if not exists public.fomento_propostas (
  id uuid primary key default gen_random_uuid(),
  numero text unique,                                   -- gerado: FP-2026-00001 (ou informado)
  data_proposta date not null default current_date,
  nome text not null,
  cpf text,
  cnpj text,
  whatsapp text,
  linha_id uuid references public.fomento_linhas(id) on delete set null,
  valor_solicitado numeric(12,2),
  valor_concedido numeric(12,2),
  prazo_meses int,
  status text not null default 'novo'
    check (status in ('novo','em_contato','documentacao','em_analise','concedido','negado','excluido')),
  agente_id uuid references public.fomento_agentes(id) on delete set null,
  interesse_id uuid,                                    -- se veio de um pré-cadastro do site
  observacoes text,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists fomento_propostas_status_idx on public.fomento_propostas(status);

create table if not exists public.fomento_historico (
  id bigint generated always as identity primary key,
  proposta_id uuid references public.fomento_propostas(id) on delete cascade,
  acao text not null,            -- criada / status / edicao
  de_status text,
  para_status text,
  detalhe text,
  usuario_id uuid default auth.uid(),
  criado_em timestamptz not null default now()
);

create or replace function public.fomento_propostas_antes()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and (new.numero is null or new.numero = '') then
    new.numero := 'FP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.fomento_proposta_seq')::text, 5, '0');
  end if;
  new.atualizado_em := now();
  return new;
end $$;

create or replace function public.fomento_propostas_depois()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.fomento_historico (proposta_id, acao, para_status, detalhe)
    values (new.id, 'criada', new.status, 'Proposta ' || new.numero || ' cadastrada');
  elsif new.status is distinct from old.status then
    insert into public.fomento_historico (proposta_id, acao, de_status, para_status)
    values (new.id, 'status', old.status, new.status);
  else
    insert into public.fomento_historico (proposta_id, acao, detalhe)
    values (new.id, 'edicao', 'Dados da proposta alterados');
  end if;
  return new;
end $$;

drop trigger if exists fomento_propostas_antes on public.fomento_propostas;
create trigger fomento_propostas_antes before insert or update on public.fomento_propostas
  for each row execute function public.fomento_propostas_antes();
drop trigger if exists fomento_propostas_depois on public.fomento_propostas;
create trigger fomento_propostas_depois after insert or update on public.fomento_propostas
  for each row execute function public.fomento_propostas_depois();

-- -----------------------------------------------------------------------------
-- 5) LEMBRETES DE ATENDIMENTO
-- -----------------------------------------------------------------------------
create table if not exists public.fomento_agenda (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  data_hora timestamptz not null,
  proposta_id uuid references public.fomento_propostas(id) on delete cascade,
  agente_id uuid references public.fomento_agentes(id) on delete set null,
  concluido boolean not null default false,
  criado_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 6) MATERIAIS / PDFs PÚBLICOS
-- -----------------------------------------------------------------------------
create table if not exists public.fomento_materiais (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'informativo'
    check (tipo in ('cartilha','taxas','documentacao','informativo')),
  linha_id uuid references public.fomento_linhas(id) on delete set null,
  arquivo_url text not null,
  publicado boolean not null default true,
  atualizado_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 7) PRÉ-CADASTRO DE INTERESSE (vem do site público — NÃO é proposta oficial)
-- -----------------------------------------------------------------------------
create table if not exists public.fomento_interesses (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  whatsapp text not null,
  cidade text,
  linha_id uuid references public.fomento_linhas(id) on delete set null,
  tipo_contato text not null default 'interesse'
    check (tipo_contato in ('atendimento','duvida','agendamento','interesse','simulacao')),
  valor_desejado numeric(12,2),
  prazo_meses int,
  mensagem text,
  consentimento_lgpd boolean not null default false,
  status text not null default 'novo' check (status in ('novo','contatado','convertido','descartado')),
  proposta_id uuid references public.fomento_propostas(id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint fomento_interesse_consentimento check (consentimento_lgpd = true)
);

-- -----------------------------------------------------------------------------
-- 8) REGISTRO DE ACESSOS (LGPD — quem abriu o painel / viu dados pessoais)
-- -----------------------------------------------------------------------------
create table if not exists public.fomento_acessos (
  id bigint generated always as identity primary key,
  usuario_id uuid default auth.uid(),
  acao text not null,           -- abriu_painel / viu_documento_pessoal / exportou
  referencia text,
  criado_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 9) SEGURANÇA (RLS)
-- -----------------------------------------------------------------------------
alter table public.fomento_agentes    enable row level security;
alter table public.fomento_modulo_config     enable row level security;
alter table public.fomento_linhas     enable row level security;
alter table public.fomento_propostas  enable row level security;
alter table public.fomento_historico  enable row level security;
alter table public.fomento_agenda  enable row level security;
alter table public.fomento_materiais  enable row level security;
alter table public.fomento_interesses enable row level security;
alter table public.fomento_acessos    enable row level security;

do $$
declare r record;
begin
  -- remove só as políticas deste módulo, para poder recriar ao rodar de novo
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename like 'fomento\_%' escape '\'
             and tablename <> 'fomento_leads' and policyname like 'fomento:%'
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Público (site): só lê o que é para divulgação
create policy "fomento: leitura publica config"    on public.fomento_modulo_config    for select using (true);
create policy "fomento: leitura publica linhas"    on public.fomento_linhas    for select using (ativo or public.fomento_pode_acessar());
create policy "fomento: leitura publica materiais" on public.fomento_materiais for select using (publicado or public.fomento_pode_acessar());
create policy "fomento: site envia interesse"      on public.fomento_interesses for insert with check (status = 'novo' and proposta_id is null);

-- Gestão (admin geral ou agente gestor)
create policy "fomento: gestor edita config"     on public.fomento_modulo_config    for update using (public.fomento_pode_gerir());
create policy "fomento: gestor edita linhas"     on public.fomento_linhas    for all using (public.fomento_pode_gerir()) with check (public.fomento_pode_gerir());
create policy "fomento: gestor edita materiais"  on public.fomento_materiais for all using (public.fomento_pode_gerir()) with check (public.fomento_pode_gerir());
create policy "fomento: gestor edita agentes"    on public.fomento_agentes   for all using (public.fomento_pode_gerir()) with check (public.fomento_pode_gerir());
create policy "fomento: equipe ve agentes"       on public.fomento_agentes   for select using (public.fomento_pode_acessar());

-- Dados pessoais (CPF, CNPJ, WhatsApp): só a equipe do Fomento
create policy "fomento: equipe gerencia propostas"   on public.fomento_propostas  for all using (public.fomento_pode_acessar()) with check (public.fomento_pode_acessar());
create policy "fomento: equipe gerencia lembretes"   on public.fomento_agenda  for all using (public.fomento_pode_acessar()) with check (public.fomento_pode_acessar());
create policy "fomento: equipe ve interesses"        on public.fomento_interesses for select using (public.fomento_pode_acessar());
create policy "fomento: equipe atualiza interesses"  on public.fomento_interesses for update using (public.fomento_pode_acessar());
create policy "fomento: gestor apaga interesses"     on public.fomento_interesses for delete using (public.fomento_pode_gerir());
create policy "fomento: equipe ve historico"         on public.fomento_historico  for select using (public.fomento_pode_acessar());
create policy "fomento: equipe registra acesso"      on public.fomento_acessos    for insert with check (public.fomento_pode_acessar());
create policy "fomento: gestor ve acessos"           on public.fomento_acessos    for select using (public.fomento_pode_gerir());

-- Ninguém apaga proposta de verdade pelo app: "Excluído" é um status (mantém histórico).
-- (A política "for all" acima permite delete à equipe; para bloquear, descomente:)
-- create policy "fomento: sem delete" on public.fomento_propostas as restrictive for delete using (false);

-- -----------------------------------------------------------------------------
-- 10) STORAGE — bucket público para os PDFs informativos
--     (documentos pessoais NÃO vão aqui; o bucket privado documentos-fomento
--      já existente continua sendo usado para isso)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('fomento-materiais', 'fomento-materiais', true)
on conflict (id) do nothing;

drop policy if exists "fomento: leitura publica pdfs" on storage.objects;
drop policy if exists "fomento: gestor envia pdfs"    on storage.objects;
drop policy if exists "fomento: gestor altera pdfs"   on storage.objects;
drop policy if exists "fomento: gestor apaga pdfs"    on storage.objects;
create policy "fomento: leitura publica pdfs" on storage.objects for select using (bucket_id = 'fomento-materiais');
create policy "fomento: gestor envia pdfs"    on storage.objects for insert with check (bucket_id = 'fomento-materiais' and public.fomento_pode_gerir());
create policy "fomento: gestor altera pdfs"   on storage.objects for update using (bucket_id = 'fomento-materiais' and public.fomento_pode_gerir());
create policy "fomento: gestor apaga pdfs"    on storage.objects for delete using (bucket_id = 'fomento-materiais' and public.fomento_pode_gerir());

-- -----------------------------------------------------------------------------
-- 11) COMO LIBERAR O ADEMIR (rode depois que ele criar a conta no site)
--     Troque o e-mail abaixo pelo e-mail que ele usou no cadastro:
--
-- insert into public.fomento_agentes (user_id, nome, whatsapp, papel)
-- select u.id, 'Ademir', '44999999999', 'gestor'
-- from auth.users u where u.email = 'email-do-ademir@exemplo.com'
-- on conflict (user_id) do update set papel = 'gestor', ativo = true;
-- -----------------------------------------------------------------------------

-- =============================================================================
-- 12) RANKING OFICIAL DE IVATUBA (lançado manualmente pelo Agente, a partir do
--     Ranking Geral do FomentoNet). Só os números de Ivatuba — nenhum dado de
--     outros agentes do Paraná é guardado aqui.
-- =============================================================================
create table if not exists public.fomento_ranking_oficial (
  id uuid primary key default gen_random_uuid(),
  data_referencia date not null default current_date,
  posicao_geral int,
  pontuacao numeric(12,2),
  faixa text,
  posicao_faixa int,
  observacao text,
  publicar boolean not null default true,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now()
);
alter table public.fomento_ranking_oficial enable row level security;
drop policy if exists "fomento: leitura publica ranking" on public.fomento_ranking_oficial;
drop policy if exists "fomento: equipe gerencia ranking" on public.fomento_ranking_oficial;
create policy "fomento: leitura publica ranking" on public.fomento_ranking_oficial for select using (publicar or public.fomento_pode_acessar());
create policy "fomento: equipe gerencia ranking" on public.fomento_ranking_oficial for all using (public.fomento_pode_acessar()) with check (public.fomento_pode_acessar());
alter table public.fomento_ranking_oficial add column if not exists total_geral int;
alter table public.fomento_ranking_oficial add column if not exists total_faixa int;

-- =============================================================================
-- 13) IMPORTAÇÃO DO FOMENTONET (planilha "Operação Microcrédito")
--     O número da proposta = Código da Operação (único), então reimportar
--     atualiza em vez de duplicar.
-- =============================================================================
alter table public.fomento_propostas add column if not exists etapa_fomentonet text;
alter table public.fomento_propostas add column if not exists etapa_desde date;
alter table public.fomento_propostas add column if not exists codigo_contrato text;
alter table public.fomento_propostas add column if not exists linha_fomentonet text;
alter table public.fomento_propostas add column if not exists municipio text;
alter table public.fomento_propostas add column if not exists motivo_recusa text;
alter table public.fomento_propostas add column if not exists importado_em timestamptz;

-- Reimportar sem mudança nenhuma não polui o histórico.
create or replace function public.fomento_propostas_depois()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.fomento_historico (proposta_id, acao, para_status, detalhe)
    values (new.id, 'criada', new.status, 'Proposta ' || new.numero || case when new.importado_em is not null then ' importada do FomentoNet' else ' cadastrada' end);
  elsif new.status is distinct from old.status then
    insert into public.fomento_historico (proposta_id, acao, de_status, para_status, detalhe)
    values (new.id, 'status', old.status, new.status, case when new.importado_em is distinct from old.importado_em then 'Atualizado pela importação do FomentoNet' end);
  elsif (to_jsonb(new) - 'atualizado_em' - 'importado_em') is distinct from (to_jsonb(old) - 'atualizado_em' - 'importado_em') then
    insert into public.fomento_historico (proposta_id, acao, detalhe)
    values (new.id, 'edicao', case when new.importado_em is distinct from old.importado_em then 'Dados atualizados pela importação do FomentoNet' else 'Dados da proposta alterados' end);
  end if;
  return new;
end $$;

-- =============================================================================
-- 14) PAINEL DE CRÉDITO PÚBLICO — só números agregados (nenhum dado pessoal)
-- =============================================================================
alter table public.fomento_modulo_config add column if not exists mostrar_resumo boolean not null default true;

-- Ciclo anual da Fomento: novembro a outubro. O primeiro ciclo reúne tudo
-- até 31/10/2026 (2025 – out/2026); depois: nov/2026 – out/2027, etc.
create or replace function public.fomento_ciclo_fim(d date)
returns int language sql immutable as $$
  select greatest(2026, extract(year from d)::int + case when extract(month from d) >= 11 then 1 else 0 end);
$$;

drop function if exists public.fomento_resumo_publico();
create or replace function public.fomento_resumo_publico()
returns json language sql stable security definer set search_path = public as $$
  select case when coalesce((select mostrar_resumo from public.fomento_modulo_config where id = 1), true) then
    coalesce((select json_agg(c order by c.ciclo desc) from (
      select public.fomento_ciclo_fim(data_proposta) as ciclo,
        count(*) filter (where status <> 'excluido') as total_propostas,
        count(*) filter (where status = 'concedido') as concedidos,
        count(*) filter (where status = 'negado') as recusados,
        coalesce(sum(valor_solicitado) filter (where status <> 'excluido'), 0) as valor_solicitado,
        coalesce(sum(coalesce(valor_concedido, valor_solicitado)) filter (where status = 'concedido'), 0) as valor_concedido,
        case when count(*) filter (where status in ('concedido','negado')) = 0 then 0
             else round(100.0 * count(*) filter (where status = 'concedido')
                        / count(*) filter (where status in ('concedido','negado'))) end as taxa_aprovacao,
        max(atualizado_em) as atualizado_em
      from public.fomento_propostas
      group by 1
    ) c), '[]'::json)
  else null end;
$$;
grant execute on function public.fomento_resumo_publico() to anon, authenticated;

-- =============================================================================
-- 15) DATA DA DECISÃO — concedidas/recusadas contam no ciclo em que foram
--     decididas (ex.: cadastrada em outubro, concedida em novembro → ciclo novo)
-- =============================================================================
alter table public.fomento_propostas add column if not exists data_decisao date;

create or replace function public.fomento_propostas_antes()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and (new.numero is null or new.numero = '') then
    new.numero := 'FP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.fomento_proposta_seq')::text, 5, '0');
  end if;
  if new.status in ('concedido','negado') then
    if new.data_decisao is null and (tg_op = 'INSERT' or old.status is distinct from new.status) then
      new.data_decisao := coalesce(new.etapa_desde, current_date);
    end if;
  else
    new.data_decisao := null;
  end if;
  new.atualizado_em := now();
  return new;
end $$;

create or replace function public.fomento_propostas_depois()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.fomento_historico (proposta_id, acao, para_status, detalhe)
    values (new.id, 'criada', new.status, 'Proposta ' || new.numero || case when new.importado_em is not null then ' importada do FomentoNet' else ' cadastrada' end);
  elsif new.status is distinct from old.status then
    insert into public.fomento_historico (proposta_id, acao, de_status, para_status, detalhe)
    values (new.id, 'status', old.status, new.status, case when new.importado_em is distinct from old.importado_em then 'Atualizado pela importação do FomentoNet' end);
  elsif (to_jsonb(new) - 'atualizado_em' - 'importado_em' - 'data_decisao') is distinct from (to_jsonb(old) - 'atualizado_em' - 'importado_em' - 'data_decisao') then
    insert into public.fomento_historico (proposta_id, acao, detalhe)
    values (new.id, 'edicao', case when new.importado_em is distinct from old.importado_em then 'Dados atualizados pela importação do FomentoNet' else 'Dados da proposta alterados' end);
  end if;
  return new;
end $$;

-- preenche as que já existem (importadas): data em que entraram na etapa
update public.fomento_propostas
   set data_decisao = coalesce(etapa_desde, data_proposta)
 where status in ('concedido','negado') and data_decisao is null;

create or replace function public.fomento_resumo_publico()
returns json language sql stable security definer set search_path = public as $$
  select case when coalesce((select mostrar_resumo from public.fomento_modulo_config where id = 1), true) then
    coalesce((select json_agg(c order by c.ciclo desc) from (
      select public.fomento_ciclo_fim(case when status in ('concedido','negado') then coalesce(data_decisao, etapa_desde, data_proposta) else data_proposta end) as ciclo,
        count(*) filter (where status <> 'excluido') as total_propostas,
        count(*) filter (where status = 'concedido') as concedidos,
        count(*) filter (where status = 'negado') as recusados,
        coalesce(sum(valor_solicitado) filter (where status <> 'excluido'), 0) as valor_solicitado,
        coalesce(sum(coalesce(valor_concedido, valor_solicitado)) filter (where status = 'concedido'), 0) as valor_concedido,
        case when count(*) filter (where status in ('concedido','negado')) = 0 then 0
             else round(100.0 * count(*) filter (where status = 'concedido')
                        / count(*) filter (where status in ('concedido','negado'))) end as taxa_aprovacao,
        max(atualizado_em) as atualizado_em
      from public.fomento_propostas
      group by 1
    ) c), '[]'::json)
  else null end;
$$;
grant execute on function public.fomento_resumo_publico() to anon, authenticated;

-- =============================================================================
-- 16) CONDIÇÕES DAS LINHAS (informadas pelo Agente de Crédito)
--     Microcrédito: R$ 1.000 a R$ 20.000, até 36 parcelas, carência até 3 meses.
--     Fomento Giro Fácil: R$ 1.000 a R$ 500.000.
-- =============================================================================
update public.fomento_linhas
   set valor_min = 1000, valor_max = 20000, prazo_max_meses = 36, carencia_max_meses = 3,
       valores  = coalesce(nullif(valores, ''),  'De R$ 1.000 a R$ 20.000'),
       prazos   = coalesce(nullif(prazos, ''),   'Até 36 parcelas'),
       carencia = coalesce(nullif(carencia, ''), 'Até 3 meses'),
       atualizado_em = now()
 where slug in ('micro-facil','micro-mulher','micro-mulher-rural','micro-rural','micro-emergencial','recupera-micro');

insert into public.fomento_linhas (slug, nome, descricao, finalidade, publico_alvo, valores, valor_min, valor_max, ordem, cor)
values ('giro-facil', 'Fomento Giro Fácil', 'Capital de giro com processo simplificado para micro, pequenas e médias empresas.',
        'Capital de giro para o dia a dia da empresa (estoque, folha, despesas).', 'Empresas com CNPJ.',
        'De R$ 1.000 a R$ 500.000', 1000, 500000, 10, '#1E8E5A')
on conflict (slug) do update
   set valor_min = 1000, valor_max = 500000,
       valores = coalesce(nullif(public.fomento_linhas.valores, ''), 'De R$ 1.000 a R$ 500.000'),
       atualizado_em = now();

insert into public.fomento_linhas (slug, nome, descricao, finalidade, publico_alvo, ordem, cor)
values ('fungetur', 'Fungetur', 'Fundo Geral do Turismo — crédito para empresas do setor de turismo.',
        'Capital de giro e investimentos em empreendimentos turísticos.', 'Empresas do turismo com cadastro no Cadastur.', 11, '#0A5AA8')
on conflict (slug) do nothing;

-- =============================================================================
-- 17) MAIS TIPOS DE MATERIAL (modelos de declaração, manuais, planilhas)
-- =============================================================================
alter table public.fomento_materiais drop constraint if exists fomento_materiais_tipo_check;
alter table public.fomento_materiais add constraint fomento_materiais_tipo_check
  check (tipo in ('cartilha','taxas','documentacao','informativo','modelo','manual','planilha'));

-- =============================================================================
-- 18) SEPARAÇÃO DO APP "FOMENTO IVATUBA" (projeto separado no mesmo Supabase)
--     As tabelas public.fomento_config e public.fomento_lembretes pertencem ao
--     outro app. Este módulo usa fomento_modulo_config e fomento_agenda, e aqui
--     removemos o que este script tinha acrescentado nas tabelas do outro app.
-- =============================================================================
drop policy if exists "fomento: leitura publica config" on public.fomento_config;
drop policy if exists "fomento: gestor edita config"   on public.fomento_config;
drop policy if exists "fomento: equipe gerencia lembretes" on public.fomento_lembretes;
alter table public.fomento_config drop column if exists mostrar_resumo;

-- =============================================================================
-- 19) CONTATOS E LOGO NA ÁREA PÚBLICA
-- =============================================================================
alter table public.fomento_modulo_config add column if not exists local_atendimento text default 'Sala do Empreendedor de Ivatuba';
alter table public.fomento_modulo_config add column if not exists whatsapp_sala text;
alter table public.fomento_modulo_config add column if not exists logo_url text;
update public.fomento_modulo_config
   set agente_nome = 'Gabriel Oliveira', whatsapp_oficial = '44988685814',
       local_atendimento = 'Sala do Empreendedor de Ivatuba', whatsapp_sala = '44988414673'
 where id = 1;
