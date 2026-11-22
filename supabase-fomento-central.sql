-- =============================================================================
-- CONECTA COMÉRCIO — FOMENTO PARANÁ
-- CENTRAL DE PROSPECÇÃO E INTELIGÊNCIA COMERCIAL DO AGENTE DE CRÉDITO
--
-- • Só acrescenta: tabelas novas com prefixo fomento_cp_ e colunas novas em
--   fomento_propostas / fomento_linhas / fomento_modulo_config.
-- • Não apaga nem renomeia nada. Pode ser rodado de novo sem estragar nada.
-- • Usa as mesmas permissões do módulo: fomento_pode_acessar() / fomento_pode_gerir().
-- =============================================================================

-- 1) CARTEIRA DE CLIENTES (também usada no mapa / radar territorial)
create table if not exists public.fomento_cp_clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  empresa text,
  cpf_cnpj text,                                   -- acesso restrito (mascarado na tela)
  doc_digitos text generated always as (nullif(regexp_replace(coalesce(cpf_cnpj, ''), '\D', '', 'g'), '')) stored,
  telefone text,
  whatsapp text,
  zap_digitos text generated always as (nullif(right(regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g'), 11), '')) stored,
  endereco text,
  bairro text,
  cidade text default 'Ivatuba',
  lat double precision,
  lng double precision,
  categoria text check (categoria in ('comercio','servicos','industria','agro','outro')),
  atividade text,                                  -- ex.: Salão de beleza
  publico text[] not null default '{}',            -- mei, microempresa, pequena, mulher, jovem, autonomo, rural, familiar, expansao
  cnae text,
  faturamento_mensal numeric(14,2),
  tempo_atividade_meses int,
  porte text,                                      -- informal, mei, me, epp, outro
  necessidade text,
  valor_pretendido numeric(14,2),
  linha_id uuid references public.fomento_linhas(id) on delete set null,
  origem text,                                     -- visita, indicacao, site, whatsapp, evento, campanha, importacao, sala_empreendedor, conecta_comercio, outro
  status text not null default 'novo' check (status in (
    'novo','prospeccao','interessado','qualificado','atendimento','documentacao',
    'elaboracao','analise','aprovado','contratado','liberado','perdido')),
  motivo_perda text,
  proximo_contato date,
  ultimo_contato timestamptz,
  visitado boolean not null default false,
  campanha_id uuid,
  interesse_id uuid references public.fomento_interesses(id) on delete set null,
  observacoes text,
  consentimento_lgpd boolean not null default false,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index if not exists fomento_cp_clientes_doc_uk on public.fomento_cp_clientes (doc_digitos) where doc_digitos is not null;
create index if not exists fomento_cp_clientes_zap_idx on public.fomento_cp_clientes (zap_digitos);
create index if not exists fomento_cp_clientes_status_idx on public.fomento_cp_clientes (status);

-- 2) ATENDIMENTOS (histórico de cada contato com o cliente)
create table if not exists public.fomento_cp_atendimentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.fomento_cp_clientes(id) on delete cascade,
  tipo text not null default 'visita' check (tipo in ('visita','presencial','ligacao','whatsapp','diagnostico','documentacao','proposta','pos_atendimento','outro')),
  data timestamptz not null default now(),
  resumo text,
  resultado text,                                  -- positivo, neutro, negativo, sem_resposta
  proxima_acao text,
  proximo_contato date,
  campanha_id uuid,
  linha_id uuid references public.fomento_linhas(id) on delete set null,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now()
);
create index if not exists fomento_cp_atend_cliente_idx on public.fomento_cp_atendimentos (cliente_id, data desc);

-- 3) CAMPANHAS COMERCIAIS (manuais, modelos do calendário ou geradas pela IA)
create table if not exists public.fomento_cp_campanhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  objetivo text,
  publico text,
  segmento text,
  linha_id uuid references public.fomento_linhas(id) on delete set null,
  inicio date,
  fim date,
  estrategia text,
  plano_visitas text,
  roteiro text,
  mensagens_whatsapp text,
  textos_redes text,
  ideias_artes text,
  calendario text,
  metas text,
  meta_clientes int,
  meta_propostas int,
  status text not null default 'planejada' check (status in ('planejada','ativa','concluida','arquivada')),
  origem text not null default 'manual' check (origem in ('manual','modelo','ia')),
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
do $$ begin
  alter table public.fomento_cp_clientes add constraint fomento_cp_clientes_campanha_fk foreign key (campanha_id) references public.fomento_cp_campanhas(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.fomento_cp_atendimentos add constraint fomento_cp_atend_campanha_fk foreign key (campanha_id) references public.fomento_cp_campanhas(id) on delete set null;
exception when duplicate_object then null; end $$;

-- 4) AGENDA E ROTEIRO DE VISITAS
create table if not exists public.fomento_cp_visitas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.fomento_cp_clientes(id) on delete cascade,
  nome text,                                       -- quando ainda não está na carteira
  data_hora timestamptz not null,
  endereco text,
  segmento text,
  objetivo text,
  linha_id uuid references public.fomento_linhas(id) on delete set null,
  campanha_id uuid references public.fomento_cp_campanhas(id) on delete set null,
  status text not null default 'agendada' check (status in ('agendada','realizada','cancelada','adiada')),
  resultado text,
  proxima_acao text,
  lembrete boolean not null default true,
  ordem_rota int,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now()
);
create index if not exists fomento_cp_visitas_data_idx on public.fomento_cp_visitas (data_hora);

-- 5) CALENDÁRIO: personalização e resultado de cada dia (o conteúdo base é gerado pelo sistema)
create table if not exists public.fomento_cp_dias (
  data date primary key,
  ajustes jsonb not null default '{}'::jsonb,      -- campos do dia editados pelo agente (tema, segmento, mensagem...)
  status text not null default 'pendente' check (status in ('pendente','executando','concluida','adiada')),
  adiada_para date,
  resultado text,
  contatos int not null default 0,
  visitas int not null default 0,
  novos_clientes int not null default 0,
  propostas int not null default 0,
  atualizado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now()
);

-- 6) DATAS LOCAIS E COMEMORATIVAS PERSONALIZADAS (aniversário de Ivatuba, feiras, eventos)
create table if not exists public.fomento_cp_datas (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  titulo text not null,
  descricao text,
  segmento text,
  repete_todo_ano boolean not null default true,
  criado_em timestamptz not null default now()
);

-- 7) BANCO DE IDEIAS PRÓPRIAS (além das 390+ ideias da biblioteca do sistema)
create table if not exists public.fomento_cp_ideias (
  id uuid primary key default gen_random_uuid(),
  categoria text not null default 'outro',
  atividade text not null,
  titulo text not null,
  oportunidades text,
  perguntas text,
  estrategia text,
  linha_id uuid references public.fomento_linhas(id) on delete set null,
  favorita boolean not null default false,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now()
);
-- ideias da biblioteca marcadas como favoritas / já usadas
create table if not exists public.fomento_cp_ideias_uso (
  chave text primary key,
  favorita boolean not null default false,
  usada_em date,
  vezes int not null default 0
);

-- 8) METAS (diárias, semanais, mensais)
create table if not exists public.fomento_cp_metas (
  id uuid primary key default gen_random_uuid(),
  periodo text not null check (periodo in ('dia','semana','mes')),
  indicador text not null check (indicador in ('novos_clientes','contatos','visitas','diagnosticos','propostas','aprovacoes','contratos','valor_liberado')),
  alvo numeric(14,2) not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (periodo, indicador)
);
insert into public.fomento_cp_metas (periodo, indicador, alvo) values
  ('dia','contatos',5), ('dia','novos_clientes',2), ('semana','visitas',10), ('semana','diagnosticos',5),
  ('semana','propostas',2), ('mes','propostas',8), ('mes','contratos',4)
on conflict (periodo, indicador) do nothing;

-- 9) CONFIGURAÇÕES DA CENTRAL (rotina semanal, alertas)
alter table public.fomento_modulo_config add column if not exists central_config jsonb not null default '{}'::jsonb;

-- 10) FICHA ESTRATÉGICA DAS LINHAS (conteúdo comercial editável; condições oficiais continuam nos campos já existentes)
alter table public.fomento_linhas add column if not exists estrategia jsonb not null default '{}'::jsonb;

-- 11) GESTÃO DE PROPOSTAS REAIS — campos extras na tabela existente (sem duplicar)
alter table public.fomento_propostas add column if not exists cliente_id uuid references public.fomento_cp_clientes(id) on delete set null;
alter table public.fomento_propostas add column if not exists campanha_id uuid references public.fomento_cp_campanhas(id) on delete set null;
alter table public.fomento_propostas add column if not exists objetivo text;
alter table public.fomento_propostas add column if not exists orcamentos text;
alter table public.fomento_propostas add column if not exists fornecedores text;
alter table public.fomento_propostas add column if not exists documentacao text;
alter table public.fomento_propostas add column if not exists pendencias text;
alter table public.fomento_propostas add column if not exists data_encaminhamento date;
alter table public.fomento_propostas add column if not exists valor_aprovado numeric(12,2);
alter table public.fomento_propostas add column if not exists valor_contratado numeric(12,2);
alter table public.fomento_propostas add column if not exists data_contratacao date;
alter table public.fomento_propostas add column if not exists valor_liberado numeric(12,2);
alter table public.fomento_propostas add column if not exists data_liberacao date;
alter table public.fomento_propostas add column if not exists motivo_desistencia text;
create index if not exists fomento_propostas_cliente_idx on public.fomento_propostas (cliente_id);

-- histórico das propostas passa a registrar contratação e liberação
create or replace function public.fomento_cp_propostas_marcos()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.data_contratacao is not null and (tg_op = 'INSERT' or old.data_contratacao is distinct from new.data_contratacao) then
    insert into public.fomento_historico (proposta_id, acao, detalhe)
    values (new.id, 'contratacao', 'Contrato assinado em ' || to_char(new.data_contratacao, 'DD/MM/YYYY') || coalesce(' · R$ ' || to_char(new.valor_contratado, 'FM999G999G990D00'), ''));
  end if;
  if new.data_liberacao is not null and (tg_op = 'INSERT' or old.data_liberacao is distinct from new.data_liberacao) then
    insert into public.fomento_historico (proposta_id, acao, detalhe)
    values (new.id, 'liberacao', 'Crédito liberado em ' || to_char(new.data_liberacao, 'DD/MM/YYYY') || coalesce(' · R$ ' || to_char(new.valor_liberado, 'FM999G999G990D00'), ''));
  end if;
  if new.data_encaminhamento is not null and (tg_op = 'INSERT' or old.data_encaminhamento is distinct from new.data_encaminhamento) then
    insert into public.fomento_historico (proposta_id, acao, detalhe)
    values (new.id, 'encaminhamento', 'Encaminhada para análise em ' || to_char(new.data_encaminhamento, 'DD/MM/YYYY'));
  end if;
  -- mantém o cliente da carteira no mesmo passo da proposta
  if new.cliente_id is not null then
    update public.fomento_cp_clientes c set status = case
        when new.data_liberacao is not null then 'liberado'
        when new.data_contratacao is not null then 'contratado'
        when new.status = 'concedido' then 'aprovado'
        when new.status = 'negado' then c.status
        when new.status = 'em_analise' then 'analise'
        when new.status = 'documentacao' then 'documentacao'
        else fomento_cp_status_max(c.status, 'elaboracao') end,
      atualizado_em = now()
    where c.id = new.cliente_id and c.status <> 'perdido';
  end if;
  return new;
end $$;

-- ordem do funil (só avança automaticamente, nunca volta)
create or replace function public.fomento_cp_status_max(a text, b text)
returns text language sql immutable as $$
  select case when array_position(array['novo','prospeccao','interessado','qualificado','atendimento','documentacao','elaboracao','analise','aprovado','contratado','liberado'], a)
              >= coalesce(array_position(array['novo','prospeccao','interessado','qualificado','atendimento','documentacao','elaboracao','analise','aprovado','contratado','liberado'], b), 0)
         then a else b end
$$;

drop trigger if exists fomento_cp_propostas_marcos on public.fomento_propostas;
create trigger fomento_cp_propostas_marcos after insert or update on public.fomento_propostas
  for each row execute function public.fomento_cp_propostas_marcos();

-- atendimento registrado atualiza último/próximo contato do cliente
create or replace function public.fomento_cp_atendimento_depois()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.fomento_cp_clientes
     set ultimo_contato = greatest(coalesce(ultimo_contato, new.data), new.data),
         proximo_contato = coalesce(new.proximo_contato, proximo_contato),
         visitado = visitado or new.tipo in ('visita','presencial','diagnostico'),
         status = case when status = 'novo' then 'prospeccao' else status end,
         atualizado_em = now()
   where id = new.cliente_id;
  return new;
end $$;
drop trigger if exists fomento_cp_atendimento_depois on public.fomento_cp_atendimentos;
create trigger fomento_cp_atendimento_depois after insert on public.fomento_cp_atendimentos
  for each row execute function public.fomento_cp_atendimento_depois();

create or replace function public.fomento_cp_touch()
returns trigger language plpgsql as $$ begin new.atualizado_em := now(); return new; end $$;
drop trigger if exists fomento_cp_clientes_touch on public.fomento_cp_clientes;
create trigger fomento_cp_clientes_touch before update on public.fomento_cp_clientes for each row execute function public.fomento_cp_touch();
drop trigger if exists fomento_cp_campanhas_touch on public.fomento_cp_campanhas;
create trigger fomento_cp_campanhas_touch before update on public.fomento_cp_campanhas for each row execute function public.fomento_cp_touch();
drop trigger if exists fomento_cp_dias_touch on public.fomento_cp_dias;
create trigger fomento_cp_dias_touch before update on public.fomento_cp_dias for each row execute function public.fomento_cp_touch();

-- 12) SEGURANÇA (RLS) — só a equipe do Fomento (admin do site ou agente liberado)
do $$
declare t text;
begin
  foreach t in array array['fomento_cp_clientes','fomento_cp_atendimentos','fomento_cp_campanhas','fomento_cp_visitas',
                           'fomento_cp_dias','fomento_cp_datas','fomento_cp_ideias','fomento_cp_ideias_uso','fomento_cp_metas'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "central: equipe" on public.%I', t);
    execute format('create policy "central: equipe" on public.%I for all to authenticated using (public.fomento_pode_acessar()) with check (public.fomento_pode_acessar())', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

select string_agg(table_name, ', ' order by table_name) as tabelas_da_central
  from information_schema.tables where table_schema = 'public' and table_name like 'fomento_cp_%';
