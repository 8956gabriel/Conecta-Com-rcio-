-- =============================================================================
-- FOMENTO PARANÁ — MINHA PONTUAÇÃO (controle interno do Agente de Crédito)
-- Rode este arquivo UMA VEZ no SQL Editor do Supabase (projeto conecta-comercio).
--
-- • Só CRIA a tabela nova fomento_pontuacao. Não mexe em nada que já existe
--   (o Ranking oficial de Ivatuba e o Ranking interno continuam iguais).
-- • Pode ser rodado de novo sem estragar nada.
-- • Cada lançamento fica ligado a quem lançou (auth.uid()): cada usuário vê e
--   apaga SÓ os próprios pontos. É um controle pessoal, não aparece no site.
-- • Os pontos de cada ação ficam gravados no lançamento — se um dia a tabela
--   de pontos mudar, o que já foi somado não muda.
-- =============================================================================
create table if not exists public.fomento_pontuacao (
  id uuid primary key default gen_random_uuid(),
  acao text not null,
  pontos int not null,
  quantidade int not null default 1 check (quantidade between 1 and 100),
  data date not null default current_date,
  observacao text,
  criado_por uuid not null default auth.uid() references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);
-- Atividades aceitas (refeito a cada execução, para incluir novas atividades)
alter table public.fomento_pontuacao drop constraint if exists fomento_pontuacao_acao_check;
alter table public.fomento_pontuacao add constraint fomento_pontuacao_acao_check check (acao in (
  'cadastro_proposta', 'aprovado', 'abrir_sistema', 'simulacao', 'ler_comunicados',
  'retorno_proposta', 'renegociacao', 'renegociacao_prejuizo', 'excluido', 'plano_acao', 'saldo_inicial', 'manual'
));
create index if not exists fomento_pontuacao_usuario_data on public.fomento_pontuacao (criado_por, data desc);

alter table public.fomento_pontuacao enable row level security;
drop policy if exists "fomento: ve propria pontuacao"     on public.fomento_pontuacao;
drop policy if exists "fomento: lanca propria pontuacao"  on public.fomento_pontuacao;
drop policy if exists "fomento: apaga propria pontuacao"  on public.fomento_pontuacao;
drop policy if exists "fomento: edita propria pontuacao"  on public.fomento_pontuacao;
create policy "fomento: ve propria pontuacao"    on public.fomento_pontuacao for select
  using (criado_por = auth.uid() and public.fomento_pode_acessar());
create policy "fomento: lanca propria pontuacao" on public.fomento_pontuacao for insert
  with check (criado_por = auth.uid() and public.fomento_pode_acessar());
create policy "fomento: edita propria pontuacao" on public.fomento_pontuacao for update
  using (criado_por = auth.uid()) with check (criado_por = auth.uid());
create policy "fomento: apaga propria pontuacao" on public.fomento_pontuacao for delete
  using (criado_por = auth.uid());
