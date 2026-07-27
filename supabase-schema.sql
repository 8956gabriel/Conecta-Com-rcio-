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
  imagem_url text,
  link_url text,
  autor_id uuid references public.perfis(id),
  publicada_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- ENQUETES (cadastradas e encerradas só pelo admin)
-- -----------------------------------------------------------------------------
create table public.enquetes (
  id uuid primary key default gen_random_uuid(),
  pergunta text not null,
  opcoes jsonb not null default '[]', -- [{ "texto": "...", "votos": 0 }, ...]
  ativa boolean not null default true,
  criada_em timestamptz not null default now()
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
  imagem_url text,
  link_url text,
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
-- Editável só pelo admin; aparece no site principal (calendário público).
-- -----------------------------------------------------------------------------
create table public.eventos_calendario (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  data_inicio date not null,
  data_fim date,
  local text,
  tipo text not null check (tipo in ('feira','curso','institucional','outro')) default 'outro',
  imagem_url text,
  link_url text,
  criado_em timestamptz not null default now()
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
alter table public.perfis enable row level security;
alter table public.empresas enable row level security;
alter table public.produtos enable row level security;
alter table public.promocoes enable row level security;
alter table public.vagas enable row level security;
alter table public.candidaturas enable row level security;
alter table public.cursos enable row level security;
alter table public.noticias enable row level security;
alter table public.enquetes enable row level security;
alter table public.banners enable row level security;
alter table public.favoritos enable row level security;
alter table public.notificacoes enable row level security;
alter table public.feirantes enable row level security;
alter table public.servicos_empreendedor enable row level security;
alter table public.feira_config enable row level security;
alter table public.eventos_calendario enable row level security;

-- Leitura pública do conteúdo aprovado
create policy "leitura publica empresas aprovadas" on public.empresas
  for select using (status = 'aprovada');
create policy "leitura publica produtos" on public.produtos for select using (true);
create policy "leitura publica vagas" on public.vagas for select using (status = 'aberta');
create policy "leitura publica cursos" on public.cursos for select using (true);
create policy "leitura publica noticias" on public.noticias for select using (true);
create policy "leitura publica enquetes" on public.enquetes for select using (true);
create policy "admin gerencia enquetes" on public.enquetes
  for all using (
    exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin')
  );
create policy "leitura publica banners" on public.banners for select using (ativo = true);
create policy "admin gerencia banners" on public.banners
  for all using (
    exists (select 1 from public.perfis where id = auth.uid() and tipo = 'admin')
  );
create policy "leitura publica feirantes aprovados" on public.feirantes for select using (status = 'aprovado');
create policy "leitura publica servicos do empreendedor" on public.servicos_empreendedor for select using (ativo = true);
create policy "admin gerencia servicos do empreendedor" on public.servicos_empreendedor
  for all using (
    exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin')
  );
create policy "qualquer um pode se cadastrar como feirante" on public.feirantes for insert with check (true);
create policy "leitura publica feira_config" on public.feira_config for select using (true);
create policy "admin gerencia feira_config" on public.feira_config
  for all using (
    exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin')
  );
create policy "leitura publica eventos_calendario" on public.eventos_calendario for select using (true);
create policy "admin gerencia eventos_calendario" on public.eventos_calendario
  for all using (
    exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin')
  );
create policy "leitura publica site_config" on public.site_config for select using (true);
create policy "admin gerencia site_config" on public.site_config
  for all using (
    exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin')
  );
create policy "admin gerencia noticias" on public.noticias
  for all using (
    exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin')
  );
create policy "admin gerencia notificacoes" on public.notificacoes
  for all using (
    exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin')
  );
create policy "admin gerencia feirantes" on public.feirantes
  for all using (
    exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin')
  );
create policy "admin gerencia vagas" on public.vagas
  for all using (
    exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin')
  );
create policy "admin modera feirantes" on public.feirantes
  for update using (
    exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin')
  );

-- Empresário só edita a própria empresa
create policy "empresario edita sua empresa" on public.empresas
  for update using (auth.uid() = dono_id);
create policy "empresario cadastra empresa" on public.empresas
  for insert with check (auth.uid() = dono_id);
create policy "empresario gerencia seus produtos" on public.produtos
  for all using (
    exists (select 1 from public.empresas e where e.id = empresa_id and e.dono_id = auth.uid())
  );
create policy "empresario gerencia suas vagas" on public.vagas
  for all using (
    exists (select 1 from public.empresas e where e.id = empresa_id and e.dono_id = auth.uid())
  );

-- Favoritos são privados de cada usuário
create policy "usuario ve seus favoritos" on public.favoritos
  for all using (auth.uid() = usuario_id);

-- Perfis: cada um vê e edita o próprio
create policy "usuario ve seu perfil" on public.perfis for select using (auth.uid() = id);
create policy "usuario edita seu perfil" on public.perfis for update using (auth.uid() = id);

-- Admin: acesso total (ajuste conforme sua estratégia de roles/claims)
create policy "admin acesso total empresas" on public.empresas
  for all using (
    exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin')
  );
create policy "admin modera produtos" on public.produtos
  for all using (
    exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin')
  );

-- =============================================================================
-- STORAGE (logos, fotos de empresas e produtos)
-- Rode isto na aba Storage > Policies, após criar os buckets pelo dashboard.
-- =============================================================================
-- Buckets sugeridos: 'logos', 'fotos-empresas', 'fotos-produtos', 'banners',
-- 'fotos-feirantes' (até 5 fotos por cadastro de feirante)
-- Todos podem ser públicos para leitura (select) e restritos para upload
-- (insert) ao dono autenticado da empresa correspondente.
