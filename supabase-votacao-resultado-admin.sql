-- =============================================================================
-- VOTAÇÃO — RESULTADO SÓ PARA O ADMIN + ZERAR VOTOS
-- Rode depois do supabase-votacao-publica.sql. Supabase → SQL Editor → New
-- query → colar tudo → Run. Pode rodar mais de uma vez.
--
-- - O público não consegue mais ler a contagem de votos (nem pela API):
--   a leitura pública passa pela função enquetes_publicas(), que esconde os
--   votos, a não ser que o admin ligue "Mostrar resultado ao público".
-- - O admin continua vendo tudo no painel.
-- - zerar_enquete(): apaga os votos de uma votação (só o admin).
-- Nada de empresas, produtos ou usuários é apagado.
-- =============================================================================

alter table public.enquetes
  add column if not exists mostrar_resultado boolean not null default false;

-- Tira a leitura direta da tabela pelo público (o admin continua lendo pela
-- regra "admin gerencia enquetes").
drop policy if exists "leitura publica enquetes" on public.enquetes;

-- Leitura pública das votações, sem a contagem de votos quando ela está oculta
create or replace function public.enquetes_publicas()
returns table (
  id uuid, pergunta text, descricao text, opcoes jsonb, ativa boolean,
  exigir_localizacao boolean, encerra_em timestamptz, mostrar_resultado boolean, criada_em timestamptz
)
language sql
security definer
set search_path = public
as $$
  select e.id, e.pergunta, e.descricao,
         case when e.mostrar_resultado then e.opcoes
              else coalesce((select jsonb_agg(o - 'votos' order by ord) from jsonb_array_elements(e.opcoes) with ordinality as t(o, ord)), '[]'::jsonb) end,
         e.ativa, e.exigir_localizacao, e.encerra_em, e.mostrar_resultado, e.criada_em
  from public.enquetes e
  order by e.criada_em desc;
$$;

-- Zerar os votos de uma votação (só admin)
create or replace function public.zerar_enquete(p_enquete uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.perfis p where p.id = auth.uid() and p.tipo = 'admin') then
    raise exception 'Apenas o administrador pode zerar uma votação.';
  end if;
  delete from public.enquete_votos where enquete_id = p_enquete;
  update public.enquetes e
     set opcoes = coalesce((select jsonb_agg(jsonb_set(o, '{votos}', '0'::jsonb) order by ord)
                            from jsonb_array_elements(e.opcoes) with ordinality as t(o, ord)), '[]'::jsonb)
   where e.id = p_enquete;
  return (select opcoes from public.enquetes where id = p_enquete);
end;
$$;

-- Função de votar atualizada (não devolve a contagem quando está oculta)
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

  -- Só devolve a contagem se o admin liberou o resultado para o público
  return jsonb_build_object('ok', true, 'opcoes', (
    select case when x.mostrar_resultado then x.opcoes
                else coalesce((select jsonb_agg(o - 'votos' order by ord) from jsonb_array_elements(x.opcoes) with ordinality as t(o, ord)), '[]'::jsonb) end
    from public.enquetes x where x.id = p_enquete));
exception when unique_violation then
  return jsonb_build_object('ok', false, 'ja_votou', true, 'erro', 'Este aparelho já votou nesta votação.');
end;
$$;

grant execute on function public.enquetes_publicas() to anon, authenticated;
grant execute on function public.zerar_enquete(uuid) to authenticated;
grant execute on function public.votar_enquete(uuid, integer, text, text, double precision, double precision) to anon, authenticated;
