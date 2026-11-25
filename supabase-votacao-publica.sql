-- =============================================================================
-- VOTAÇÃO PÚBLICA (ex.: "Meu Comércio Iluminado")
-- Rode este arquivo inteiro no Supabase → SQL Editor → New query → Run.
-- Pode rodar mais de uma vez sem problema.
--
-- Como funciona o "1 voto por pessoa" SEM cadastro:
--   1) ID do aparelho  — um código aleatório salvo no celular (localStorage +
--      cookie). Mesmo aparelho não vota duas vezes na mesma votação.
--   2) Impressão do aparelho + rede (IP) — se a pessoa apagar os dados do
--      navegador ou usar aba anônima, o mesmo aparelho na mesma rede é
--      reconhecido e bloqueado.
--   3) Limite por rede — no máximo 8 votos por rede (IP) em cada votação
--      (deixa a família votar no Wi-Fi de casa, mas barra "fábrica de votos").
--   4) Localização — se ligada na votação, só aceita voto de quem está dentro
--      do raio (km) em volta da cidade.
-- O IP nunca é guardado puro: só um hash (código embaralhado).
-- =============================================================================

-- Novos campos na tabela de enquetes
alter table public.enquetes
  add column if not exists descricao text,
  add column if not exists exigir_localizacao boolean not null default true,
  add column if not exists centro_lat double precision default -23.6189,
  add column if not exists centro_lng double precision default -52.2211,
  add column if not exists raio_km numeric not null default 12,
  add column if not exists encerra_em timestamptz;

-- Registro de cada voto (quem votou não é identificado por nome)
create table if not exists public.enquete_votos (
  id uuid primary key default gen_random_uuid(),
  enquete_id uuid not null references public.enquetes(id) on delete cascade,
  opcao integer not null,
  dispositivo_id text not null,
  impressao text,
  ip_hash text,
  latitude double precision,
  longitude double precision,
  criado_em timestamptz not null default now(),
  unique (enquete_id, dispositivo_id)
);
create index if not exists enquete_votos_impressao_idx on public.enquete_votos (enquete_id, impressao, ip_hash);
create index if not exists enquete_votos_ip_idx on public.enquete_votos (enquete_id, ip_hash);

alter table public.enquete_votos enable row level security;
drop policy if exists "admin le votos" on public.enquete_votos;
create policy "admin le votos" on public.enquete_votos
  for select using (exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin'));
-- Não existe policy de INSERT pública: o voto só entra pela função abaixo.

-- -----------------------------------------------------------------------------
-- Função de votar (chamada pelo site sem login)
-- -----------------------------------------------------------------------------
create or replace function public.votar_enquete(
  p_enquete uuid,
  p_opcao integer,
  p_dispositivo text,
  p_impressao text default null,
  p_lat double precision default null,
  p_lng double precision default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.enquetes%rowtype;
  v_headers json;
  v_ip text;
  v_ip_hash text;
  v_dist double precision;
  v_qtd_ip integer;
begin
  select * into e from public.enquetes where id = p_enquete for update;
  if not found then
    return jsonb_build_object('ok', false, 'erro', 'Votação não encontrada.');
  end if;
  if not e.ativa or (e.encerra_em is not null and e.encerra_em < now()) then
    return jsonb_build_object('ok', false, 'erro', 'Esta votação já foi encerrada.');
  end if;
  if p_opcao is null or p_opcao < 0 or p_opcao >= jsonb_array_length(e.opcoes) then
    return jsonb_build_object('ok', false, 'erro', 'Opção inválida.');
  end if;
  if coalesce(length(p_dispositivo), 0) < 8 then
    return jsonb_build_object('ok', false, 'erro', 'Não consegui identificar o seu aparelho. Recarregue a página.');
  end if;

  -- 1) mesmo aparelho
  if exists (select 1 from public.enquete_votos where enquete_id = p_enquete and dispositivo_id = p_dispositivo) then
    return jsonb_build_object('ok', false, 'ja_votou', true, 'erro', 'Este aparelho já votou nesta votação.');
  end if;

  -- IP de quem está votando (vem do cabeçalho da requisição)
  begin
    v_headers := current_setting('request.headers', true)::json;
  exception when others then
    v_headers := null;
  end;
  v_ip := trim(split_part(coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-real-ip', v_headers ->> 'x-forwarded-for', ''), ',', 1));
  v_ip_hash := case when v_ip <> '' then md5(v_ip || ':' || p_enquete::text) end;

  -- 2) mesmo aparelho (impressão) na mesma rede — pega quem limpou o navegador / aba anônima
  if p_impressao is not null and v_ip_hash is not null and exists (
    select 1 from public.enquete_votos
    where enquete_id = p_enquete and impressao = p_impressao and ip_hash = v_ip_hash
  ) then
    return jsonb_build_object('ok', false, 'ja_votou', true, 'erro', 'Este aparelho já votou nesta votação.');
  end if;

  -- 3) limite por rede
  if v_ip_hash is not null then
    select count(*) into v_qtd_ip from public.enquete_votos where enquete_id = p_enquete and ip_hash = v_ip_hash;
    if v_qtd_ip >= 8 then
      return jsonb_build_object('ok', false, 'erro', 'Limite de votos desta rede de internet atingido.');
    end if;
  end if;

  -- 4) localização
  if e.exigir_localizacao and e.centro_lat is not null and e.centro_lng is not null then
    if p_lat is null or p_lng is null then
      return jsonb_build_object('ok', false, 'precisa_localizacao', true, 'erro', 'Ative a localização do celular para votar.');
    end if;
    v_dist := 6371 * 2 * asin(sqrt(
      power(sin(radians(p_lat - e.centro_lat) / 2), 2) +
      cos(radians(e.centro_lat)) * cos(radians(p_lat)) * power(sin(radians(p_lng - e.centro_lng) / 2), 2)
    ));
    if v_dist > e.raio_km then
      return jsonb_build_object('ok', false, 'fora_da_area', true, 'erro', 'Esta votação é só para quem está na cidade. Sua localização está fora da área permitida.');
    end if;
  end if;

  insert into public.enquete_votos (enquete_id, opcao, dispositivo_id, impressao, ip_hash, latitude, longitude)
  values (p_enquete, p_opcao, p_dispositivo, p_impressao, v_ip_hash, round(p_lat::numeric, 3), round(p_lng::numeric, 3));

  update public.enquetes
     set opcoes = jsonb_set(opcoes, array[p_opcao::text, 'votos'],
                            to_jsonb(coalesce((opcoes -> p_opcao ->> 'votos')::int, 0) + 1))
   where id = p_enquete;

  return jsonb_build_object('ok', true, 'opcoes', (select opcoes from public.enquetes where id = p_enquete));
exception when unique_violation then
  return jsonb_build_object('ok', false, 'ja_votou', true, 'erro', 'Este aparelho já votou nesta votação.');
end;
$$;

-- Em quais votações este aparelho já votou (pra mostrar "Você já votou")
create or replace function public.meus_votos(p_dispositivo text)
returns table (enquete_id uuid, opcao integer)
language sql
security definer
set search_path = public
as $$
  select v.enquete_id, v.opcao from public.enquete_votos v where v.dispositivo_id = p_dispositivo;
$$;

grant execute on function public.votar_enquete(uuid, integer, text, text, double precision, double precision) to anon, authenticated;
grant execute on function public.meus_votos(text) to anon, authenticated;
