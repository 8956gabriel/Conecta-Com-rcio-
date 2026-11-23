-- =============================================================================
-- MAIS BB DIGITAL (BBB+) — AMPLIAÇÃO: Treinamento ANEPS · Gerador de Formulários
-- · Sorteios Mensais e Galeria
--
-- Rode DEPOIS do supabase-maisbb.sql (que já está instalado). Este arquivo só
-- ACRESCENTA tabelas, colunas e funções novas: não altera nem apaga nada do que
-- já existe. Reaproveita os mesmos usuários, convites, perfis (admin/atendente)
-- e as funções de permissão maisbb_pode_acessar() e maisbb_e_admin().
-- Pode ser rodado de novo sem estragar nada.
--
-- PRIVACIDADE: o Gerador de Formulários NÃO tem tabela de respostas. Só os
-- MODELOS (nomes dos campos) ficam no banco; os dados dos clientes ficam apenas
-- no navegador do agente e somem ao sair da página.
-- =============================================================================

-- ---------------------------------------------------------------- CONFIGURAÇÕES NOVAS
alter table public.maisbb_config add column if not exists aneps jsonb not null default
  '{"ponto_acerto":10,"bonus_conclusao":20,"bonus_80":50,"bonus_100":100,"tempo":{"rapido":15,"intermediario":30,"completo":45},"certificacao":"ANEPS"}'::jsonb;
alter table public.maisbb_config add column if not exists galeria_sorteios boolean not null default false;  -- agentes podem ver a galeria?

-- =============================================================================
-- 1. TREINAMENTO ANEPS
-- =============================================================================
create table if not exists public.maisbb_aneps_modulos (
  id uuid primary key default gen_random_uuid(),
  ordem int not null default 1,
  titulo text not null unique,
  descricao text,
  teoria text,                                      -- conteúdo teórico
  resumo text,                                      -- resumo para revisão
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.maisbb_aneps_materiais (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references public.maisbb_aneps_modulos(id) on delete cascade,
  tipo text not null check (tipo in ('aula','pdf','video')),
  titulo text not null,
  conteudo text,                                    -- texto da aula
  url text,                                         -- PDF (arquivo enviado) ou vídeo (YouTube/Drive)
  ordem int not null default 1,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.maisbb_aneps_questoes (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references public.maisbb_aneps_modulos(id) on delete cascade,
  enunciado text not null,
  alternativas text[] not null check (array_length(alternativas, 1) = 4),   -- A, B, C, D
  correta smallint not null check (correta between 0 and 3),
  comentario text,                                  -- explicação do gabarito
  uso text not null default 'simulado' check (uso in ('simulado','estudo')),  -- estudo = questão comentada aberta no módulo
  dificuldade text not null default 'media' check (dificuldade in ('facil','media','dificil')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index if not exists maisbb_aneps_q_uk on public.maisbb_aneps_questoes (modulo_id, md5(enunciado));
create index if not exists maisbb_aneps_q_mod_idx on public.maisbb_aneps_questoes (modulo_id) where ativo;

-- Tentativas: só são criadas/corrigidas pelas funções abaixo (o agente não grava direto).
create table if not exists public.maisbb_aneps_tentativas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  modalidade text not null check (modalidade in ('rapido','intermediario','completo','exercicio')),
  modulo_id uuid references public.maisbb_aneps_modulos(id) on delete set null,
  questoes uuid[] not null,
  respostas jsonb,
  detalhe jsonb,                                    -- [{q, modulo_id, ok}] para o histórico por módulo
  acertos int,
  total int not null,
  pct numeric(5,1),
  pontos int not null default 0,
  regras jsonb,                                     -- pontuação vigente no momento (auditoria)
  tempo_limite_seg int,
  tempo_seg int,
  fora_do_tempo boolean not null default false,
  status text not null default 'em_andamento' check (status in ('em_andamento','finalizada','abandonada')),
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz
);
create index if not exists maisbb_aneps_t_user_idx on public.maisbb_aneps_tentativas (user_id, iniciado_em desc);

-- Inicia um simulado: sorteia as questões no servidor e devolve SEM o gabarito.
create or replace function public.maisbb_aneps_iniciar(p_modalidade text, p_modulo uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare n int; ids uuid[]; cfg jsonb; lim int; t maisbb_aneps_tentativas%rowtype;
begin
  if not public.maisbb_pode_acessar() then raise exception 'Sem acesso ao Mais BB Digital.'; end if;
  n := case p_modalidade when 'rapido' then 10 when 'intermediario' then 20 when 'completo' then 30 when 'exercicio' then 5 else null end;
  if n is null then raise exception 'Modalidade inválida.'; end if;
  select coalesce(aneps, '{}'::jsonb) into cfg from maisbb_config where id = 1;
  select array_agg(id) into ids from (
    select q.id from maisbb_aneps_questoes q join maisbb_aneps_modulos m on m.id = q.modulo_id
    where q.ativo and m.ativo and q.uso = 'simulado' and (p_modulo is null or q.modulo_id = p_modulo)
    order by random() limit n) s;
  if ids is null then raise exception 'Ainda não há questões cadastradas para este simulado.'; end if;
  -- simulados anteriores deixados pela metade não valem mais pontos
  update maisbb_aneps_tentativas set status = 'abandonada' where user_id = auth.uid() and status = 'em_andamento';
  lim := case when p_modalidade = 'exercicio' then null else coalesce((cfg->'tempo'->>p_modalidade)::int, n * 2) * 60 end;
  insert into maisbb_aneps_tentativas (user_id, modalidade, modulo_id, questoes, total, tempo_limite_seg, regras)
  values (auth.uid(), p_modalidade, p_modulo, ids, array_length(ids, 1), lim, cfg) returning * into t;
  return jsonb_build_object('id', t.id, 'modalidade', t.modalidade, 'total', t.total, 'tempo_limite_seg', t.tempo_limite_seg, 'iniciado_em', t.iniciado_em,
    'questoes', (select jsonb_agg(jsonb_build_object('id', q.id, 'enunciado', q.enunciado, 'alternativas', to_jsonb(q.alternativas), 'modulo', m.titulo) order by x.ord)
                 from unnest(ids) with ordinality x(qid, ord) join maisbb_aneps_questoes q on q.id = x.qid join maisbb_aneps_modulos m on m.id = q.modulo_id));
end $$;

-- Corrige no servidor, calcula pontos UMA vez e devolve o gabarito comentado.
-- Reenviar ou atualizar a página não gera pontos de novo: a tentativa fica travada.
create or replace function public.maisbb_aneps_finalizar(p_tentativa uuid, p_respostas jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t maisbb_aneps_tentativas%rowtype; ac int := 0; det jsonb := '[]'::jsonb; gab jsonb := '[]'::jsonb; r record; resp int; w jsonb; pts int := 0; seg int; atraso boolean := false; pc numeric;
begin
  select * into t from maisbb_aneps_tentativas where id = p_tentativa and user_id = auth.uid() for update;
  if not found then raise exception 'Simulado não encontrado.'; end if;
  if t.status = 'em_andamento' then
    p_respostas := coalesce(p_respostas, '{}'::jsonb);
    seg := greatest(0, extract(epoch from now() - t.iniciado_em)::int);
    atraso := t.tempo_limite_seg is not null and seg > t.tempo_limite_seg + 90;   -- 90 s de tolerância de conexão
    for r in select q.id, q.modulo_id, q.correta from unnest(t.questoes) x(qid) join maisbb_aneps_questoes q on q.id = x.qid loop
      resp := case when jsonb_typeof(p_respostas->(r.id::text)) = 'number' then (p_respostas->>(r.id::text))::int else null end;
      if resp = r.correta then ac := ac + 1; end if;
      det := det || jsonb_build_object('q', r.id, 'modulo_id', r.modulo_id, 'ok', resp is not distinct from r.correta);
    end loop;
    pc := round(100.0 * ac / greatest(t.total, 1), 1);
    w := coalesce(t.regras, '{}'::jsonb);
    if t.modalidade <> 'exercicio' then
      pts := ac * coalesce((w->>'ponto_acerto')::int, 10);
      if not atraso then
        pts := pts + coalesce((w->>'bonus_conclusao')::int, 20)
             + case when pc >= 100 then coalesce((w->>'bonus_100')::int, 100) when pc >= 80 then coalesce((w->>'bonus_80')::int, 50) else 0 end;
      end if;
    end if;
    update maisbb_aneps_tentativas set respostas = p_respostas, detalhe = det, acertos = ac, pct = pc, pontos = pts, tempo_seg = seg,
      fora_do_tempo = atraso, status = 'finalizada', finalizado_em = now() where id = t.id returning * into t;
  elsif t.status = 'abandonada' then
    raise exception 'Este simulado foi substituído por outro mais recente e não pode mais ser enviado.';
  end if;
  -- gabarito comentado (só depois de finalizado)
  select jsonb_agg(jsonb_build_object('id', q.id, 'enunciado', q.enunciado, 'alternativas', to_jsonb(q.alternativas), 'correta', q.correta,
           'resposta', case when jsonb_typeof(t.respostas->(q.id::text)) = 'number' then (t.respostas->>(q.id::text))::int end,
           'comentario', q.comentario, 'modulo', m.titulo) order by x.ord) into gab
    from unnest(t.questoes) with ordinality x(qid, ord) join maisbb_aneps_questoes q on q.id = x.qid join maisbb_aneps_modulos m on m.id = q.modulo_id;
  return jsonb_build_object('id', t.id, 'modalidade', t.modalidade, 'acertos', t.acertos, 'total', t.total, 'pct', t.pct, 'pontos', t.pontos,
    'tempo_seg', t.tempo_seg, 'fora_do_tempo', t.fora_do_tempo, 'finalizado_em', t.finalizado_em, 'gabarito', coalesce(gab, '[]'::jsonb));
end $$;

-- Ranking geral (somente simulados; exercícios de módulo não pontuam)
create or replace function public.maisbb_aneps_ranking()
returns table (user_id uuid, nome text, pontos int, simulados int, media numeric)
language sql stable security definer set search_path = public as $$
  select m.user_id, m.nome,
    coalesce(sum(t.pontos), 0)::int,
    count(t.id)::int,
    coalesce(round(avg(t.pct), 1), 0)
  from maisbb_membros m
  left join maisbb_aneps_tentativas t on t.user_id = m.user_id and t.status = 'finalizada' and t.modalidade <> 'exercicio'
  where m.ativo and public.maisbb_pode_acessar()
  group by m.user_id, m.nome
  order by 3 desc, 5 desc, 2
$$;
grant execute on function public.maisbb_aneps_iniciar(text, uuid), public.maisbb_aneps_finalizar(uuid, jsonb), public.maisbb_aneps_ranking() to authenticated;

-- =============================================================================
-- 2. GERADOR DE FORMULÁRIOS — somente os MODELOS (nunca os dados preenchidos)
-- =============================================================================
create table if not exists public.maisbb_form_modelos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  campos jsonb not null default '[]'::jsonb,        -- [{k, l, t, req, largura}]  t: texto|cpf|rg|data|telefone|email|endereco|moeda|textarea|assinatura|secao
  rodape text,
  ordem int not null default 1,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- =============================================================================
-- 3. SORTEIOS MENSAIS DE ATENDIMENTOS E GALERIA
--    (tabela separada da maisbb_sorteios, que é do "Desafio do mês")
-- =============================================================================
create or replace function public.maisbb_galeria_liberada()
returns boolean language sql stable security definer set search_path = public as $$
  select public.maisbb_e_admin() or (public.maisbb_pode_acessar() and coalesce((select galeria_sorteios from maisbb_config where id = 1), false))
$$;
grant execute on function public.maisbb_galeria_liberada() to authenticated;

create table if not exists public.maisbb_sorteios_mensais (
  id uuid primary key default gen_random_uuid(),
  ano int not null check (ano between 2000 and 2100),
  mes int not null check (mes between 1 and 12),
  data_sorteio date,
  ganhador text,
  participantes int check (participantes >= 0),     -- quantidade de atendimentos participantes
  descricao text,
  observacoes text,
  foto_path text,                                   -- foto do sorteio (bucket privado maisbb-sorteios)
  foto_ganhador_path text,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists maisbb_sm_ano_idx on public.maisbb_sorteios_mensais (ano, mes);

create table if not exists public.maisbb_sorteio_fotos (
  id uuid primary key default gen_random_uuid(),
  sorteio_id uuid references public.maisbb_sorteios_mensais(id) on delete set null,
  ano int not null check (ano between 2000 and 2100),
  mes int not null check (mes between 1 and 12),
  path text not null,
  legenda text,
  data date,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now()
);
create index if not exists maisbb_sf_ano_idx on public.maisbb_sorteio_fotos (ano, mes);

-- =============================================================================
-- SEGURANÇA (RLS) DAS TABELAS NOVAS
-- =============================================================================
do $$
declare t text;
  conteudo text[] := array['maisbb_aneps_modulos','maisbb_aneps_materiais','maisbb_form_modelos'];   -- equipe lê, admin altera
  sorteio text[] := array['maisbb_sorteios_mensais','maisbb_sorteio_fotos'];                     -- admin altera, equipe lê se liberado
begin
  foreach t in array conteudo || sorteio || array['maisbb_aneps_questoes','maisbb_aneps_tentativas'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('drop policy if exists "maisbb ler" on public.%I', t);
    execute format('drop policy if exists "maisbb escrever" on public.%I', t);
  end loop;
  foreach t in array conteudo loop
    execute format('create policy "maisbb ler" on public.%I for select to authenticated using (public.maisbb_pode_acessar())', t);
    execute format('create policy "maisbb escrever" on public.%I for all to authenticated using (public.maisbb_e_admin()) with check (public.maisbb_e_admin())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
  foreach t in array sorteio loop
    execute format('create policy "maisbb ler" on public.%I for select to authenticated using (public.maisbb_galeria_liberada())', t);
    execute format('create policy "maisbb escrever" on public.%I for all to authenticated using (public.maisbb_e_admin()) with check (public.maisbb_e_admin())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
  -- questões: o gabarito das questões de simulado só o admin vê; as "de estudo" (comentadas) ficam abertas à equipe
  create policy "maisbb ler" on public.maisbb_aneps_questoes for select to authenticated using (public.maisbb_e_admin() or (uso = 'estudo' and ativo and public.maisbb_pode_acessar()));
  create policy "maisbb escrever" on public.maisbb_aneps_questoes for all to authenticated using (public.maisbb_e_admin()) with check (public.maisbb_e_admin());
  grant select, insert, update, delete on public.maisbb_aneps_questoes to authenticated;
  -- tentativas: cada agente vê só as suas; admin vê todas; ninguém grava direto (só pelas funções)
  create policy "maisbb ler" on public.maisbb_aneps_tentativas for select to authenticated using (user_id = auth.uid() or public.maisbb_e_admin());
  revoke insert, update, delete on public.maisbb_aneps_tentativas from authenticated;
  grant select on public.maisbb_aneps_tentativas to authenticated;

  foreach t in array array['maisbb_aneps_modulos','maisbb_aneps_questoes','maisbb_form_modelos','maisbb_sorteios_mensais','maisbb_sorteio_fotos'] loop
    execute format('drop trigger if exists maisbb_log on public.%I', t);
    execute format('create trigger maisbb_log after insert or update or delete on public.%I for each row execute function public.maisbb_registrar()', t);
  end loop;
  foreach t in array array['maisbb_aneps_modulos','maisbb_aneps_questoes','maisbb_form_modelos','maisbb_sorteios_mensais'] loop
    execute format('drop trigger if exists maisbb_touch on public.%I', t);
    execute format('create trigger maisbb_touch before update on public.%I for each row execute function public.maisbb_touch()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- FOTOS DOS SORTEIOS (bucket PRIVADO, links temporários)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('maisbb-sorteios', 'maisbb-sorteios', false, 10485760, array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "maisbb sorteios ver" on storage.objects;
create policy "maisbb sorteios ver" on storage.objects for select to authenticated using (bucket_id = 'maisbb-sorteios' and public.maisbb_galeria_liberada());
drop policy if exists "maisbb sorteios enviar" on storage.objects;
create policy "maisbb sorteios enviar" on storage.objects for insert to authenticated with check (bucket_id = 'maisbb-sorteios' and public.maisbb_e_admin());
drop policy if exists "maisbb sorteios alterar" on storage.objects;
create policy "maisbb sorteios alterar" on storage.objects for update to authenticated using (bucket_id = 'maisbb-sorteios' and public.maisbb_e_admin());
drop policy if exists "maisbb sorteios apagar" on storage.objects;
create policy "maisbb sorteios apagar" on storage.objects for delete to authenticated using (bucket_id = 'maisbb-sorteios' and public.maisbb_e_admin());

select string_agg(table_name, ', ' order by table_name) as tabelas_novas
  from information_schema.tables where table_schema = 'public'
  and table_name in ('maisbb_aneps_modulos','maisbb_aneps_materiais','maisbb_aneps_questoes','maisbb_aneps_tentativas','maisbb_form_modelos','maisbb_sorteios_mensais','maisbb_sorteio_fotos');
