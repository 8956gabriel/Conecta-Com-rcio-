-- =============================================================================
-- CONECTA COMÉRCIO — Schema Supabase (PostgreSQL)
-- Rode isto no SQL Editor do seu projeto Supabase (supabase.com/dashboard).
-- =============================================================================

-- Extensão para localização (mapa das empresas)
create extension if not exists postgis;

-- -----------------------------------------------------------------------------
-- PERFIS (estende auth.users do Supabase Auth)
-- -----------------------------------------------------------------------------
create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('cliente','empresario','admin')) default 'cliente',
  telefone text,
  criado_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- EMPRESAS
-- -----------------------------------------------------------------------------
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid not null references public.perfis(id) on delete cascade,
  nome text not null,
  categoria text not null,
  descricao text,
  logo_url text,
  fotos_urls text[] default '{}',
  endereco text,
  bairro text,
  whatsapp text,
  instagram text,
  horario_atendimento text,
  latitude double precision,
  longitude double precision,
  selo_compre_em_ivatuba boolean default false,
  aceita_cartao_servidor boolean default false,
  status text not null check (status in ('pendente','aprovada','recusada')) default 'pendente',
  visualizacoes integer not null default 0,
  criado_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- PRODUTOS
-- -----------------------------------------------------------------------------
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  descricao text,
  preco numeric(10,2),
  categoria text,
  foto_url text,
  imagem_ilustrativa boolean not null default false, -- true = imagem gerada por IA, não é foto real
  ativo boolean default true,
  criado_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- PROMOÇÕES
-- -----------------------------------------------------------------------------
create table public.promocoes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  desconto_percentual numeric(5,2) not null,
  valida_ate date not null,
  criado_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- VAGAS DE EMPREGO
-- -----------------------------------------------------------------------------
create table public.vagas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cargo text not null,
  salario text,
  requisitos text,
  cidade text default 'Ivatuba - PR',
  status text not null check (status in ('aberta','fechada')) default 'aberta',
  criado_em timestamptz not null default now()
);

create table public.candidaturas (
  id uuid primary key default gen_random_uuid(),
  vaga_id uuid not null references public.vagas(id) on delete cascade,
  candidato_id uuid not null references public.perfis(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (vaga_id, candidato_id)
);

-- -----------------------------------------------------------------------------
-- CURSOS E EVENTOS (Sala do Empreendedor / Sebrae)
-- -----------------------------------------------------------------------------
create table public.cursos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  data_evento date,
  local text,
  origem text check (origem in ('sala_empreendedor','sebrae','prefeitura')),
  criado_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- NOTÍCIAS
-- -----------------------------------------------------------------------------
create table public.noticias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  conteudo text,
  autor_id uuid references public.perfis(id),
  publicada_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- BANNERS (home)
-- -----------------------------------------------------------------------------
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  titulo text,
  imagem_url text not null,
  link_url text,
  ordem integer default 0,
  ativo boolean default true
);

-- -----------------------------------------------------------------------------
-- FAVORITOS
-- -----------------------------------------------------------------------------
create table public.favoritos (
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (usuario_id, empresa_id)
);

-- -----------------------------------------------------------------------------
-- SERVIÇOS DO EMPREENDEDOR (botões editáveis pelo admin: cor, logo, link)
-- -----------------------------------------------------------------------------
create table public.servicos_empreendedor (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  url text not null,
  cor_hex text not null default '#0A5AA8',
  logo_url text, -- se vazio, o site usa um ícone padrão
  ordem integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Seed com os 5 botões já usados na plataforma (o admin pode editar cor/logo depois)
insert into public.servicos_empreendedor (titulo, descricao, url, cor_hex, ordem) values
  ('Abrir e gerenciar o MEI', 'Emita o DAS mensal, consulte débitos e regularize seu MEI (PGMEI).', 'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao', '#0A5AA8', 1),
  ('Declaração Anual do MEI', 'Envie a DASN-SIMEI, obrigatória todo ano para quem é MEI.', 'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/dasnsimei.app/Identificacao', '#0A5AA8', 2),
  ('Emitir Nota Fiscal (NFS-e)', 'Emissor Nacional de Nota Fiscal de Serviço eletrônica.', 'https://www.nfse.gov.br/EmissorNacional/Login?ReturnUrl=%2fEmissorNacional', '#0A5AA8', 3),
  ('Parcelar débitos do Simples', 'Solicite ou acompanhe parcelamento de débitos do Simples Nacional.', 'https://www8.receita.fazenda.gov.br/simplesnacional/servicos/grupo.aspx?grp=14', '#0A5AA8', 4),
  ('Empréstimo ao Empreendedor', 'Linhas de crédito da Fomento Paraná: microcrédito, capital de giro, máquinas e mais.', 'https://www.fomento.pr.gov.br/Linhas-de-Credito', '#E8A23D', 5);

-- -----------------------------------------------------------------------------
-- FEIRANTES (Feira do Empreendedor)
-- -----------------------------------------------------------------------------
create table public.feirantes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  produto text not null,
  whatsapp text not null,
  instagram text,
  fotos_urls text[] default '{}',
  status text not null check (status in ('pendente','aprovado','recusado')) default 'pendente',
  criado_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- NOTIFICAÇÕES (enviadas pelo admin)
-- -----------------------------------------------------------------------------
create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  mensagem text not null,
  enviada_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- FEIRA REGULAR (Feira do Empreendedor) — linha única, editável só pelo admin
-- -----------------------------------------------------------------------------
create table public.feira_config (
  id integer primary key default 1,
  dia text not null default 'Toda quinta-feira',
  horario text not null default '16h às 20h',
  local text not null default 'Praça Central de Ivatuba',
  atualizado_em timestamptz not null default now(),
  constraint feira_config_linha_unica check (id = 1)
);
insert into public.feira_config (id) values (1);

-- -----------------------------------------------------------------------------
-- CALENDÁRIO DE EVENTOS — feiras especiais, cursos e eventos institucionais.
-- Editável só pelo
