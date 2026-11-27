-- =============================================================================
-- SEGURANÇA — FASE 2 (auditoria da Reestruturação, nov/2026)
-- Rode no Supabase: SQL Editor > New query > colar tudo > Run. Pode rodar de novo.
-- RODE SÓ DEPOIS de publicar o código que usa as funções abaixo (pedido do GitHub
-- "Reestruturação Gestão 360"), senão o crachá público e o aviso no celular
-- ficariam sem o caminho antigo.
--
-- Problemas corrigidos (encontrados por consulta só de leitura em 27/11/2026):
--   1. credenciais: qualquer visitante conseguia LISTAR todas as credenciais,
--      com nome e TELEFONE (LGPD). Agora o público só abre UMA credencial, pelo
--      código do QR, e sem o telefone.
--   2. push_subscriptions: regras de alteração e exclusão abertas a qualquer um
--      (dava para apagar as inscrições de todos). Agora cada aparelho só mexe na
--      própria inscrição, pela função.
--   3. Buckets públicos de imagem sem limite de tamanho e tipo de arquivo.
-- Nenhum dado é apagado ou alterado.
-- =============================================================================

-- 1) CREDENCIAIS --------------------------------------------------------------
create or replace function public.credencial_publica(p_codigo uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(c) - 'telefone'
  from public.credenciais c
  where c.codigo = p_codigo
  limit 1;
$$;
revoke all on function public.credencial_publica(uuid) from public;
grant execute on function public.credencial_publica(uuid) to anon, authenticated;

-- Equipe (admin/editor) continua vendo e gerenciando a lista no painel.
drop policy if exists "equipe le credenciais" on public.credenciais;
create policy "equipe le credenciais" on public.credenciais for select
  using (public.central_e_editor());

-- Tira a leitura pública da tabela inteira.
drop policy if exists "leitura_publica_credencial_por_codigo" on public.credenciais;

-- 2) AVISOS NO CELULAR (push) -------------------------------------------------
create or replace function public.push_registrar(p_endpoint text, p_p256dh text, p_auth text, p_favoritos jsonb default '[]'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fav public.push_subscriptions.empresas_favoritas%type;
begin
  if coalesce(p_endpoint, '') = '' or p_endpoint !~ '^https://' then
    raise exception 'Inscrição inválida.' using errcode = '22023';
  end if;
  -- converte a lista para o tipo da coluna, seja ele qual for
  fav := (jsonb_populate_record(null::public.push_subscriptions, jsonb_build_object('empresas_favoritas', coalesce(p_favoritos, '[]'::jsonb)))).empresas_favoritas;
  insert into public.push_subscriptions (endpoint, p256dh, auth, empresas_favoritas, atualizado_em)
  values (p_endpoint, p_p256dh, p_auth, fav, now())
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth,
        empresas_favoritas = excluded.empresas_favoritas, atualizado_em = now();
end;
$$;

create or replace function public.push_atualizar_favoritos(p_endpoint text, p_favoritos jsonb default '[]'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fav public.push_subscriptions.empresas_favoritas%type;
begin
  fav := (jsonb_populate_record(null::public.push_subscriptions, jsonb_build_object('empresas_favoritas', coalesce(p_favoritos, '[]'::jsonb)))).empresas_favoritas;
  update public.push_subscriptions
     set empresas_favoritas = fav, atualizado_em = now()
   where endpoint = p_endpoint;
end;
$$;
revoke all on function public.push_registrar(text, text, text, jsonb) from public;
revoke all on function public.push_atualizar_favoritos(text, jsonb) from public;
grant execute on function public.push_registrar(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.push_atualizar_favoritos(text, jsonb) to anon, authenticated;

-- Fecha as regras abertas (o servidor que envia os avisos usa a chave de
-- serviço e continua podendo limpar inscrições vencidas).
drop policy if exists "remove_subscription_por_endpoint" on public.push_subscriptions;
drop policy if exists "atualiza_subscription_por_endpoint" on public.push_subscriptions;

-- 3) LIMITES DOS BUCKETS PÚBLICOS ---------------------------------------------
update storage.buckets set file_size_limit = 10485760,           -- 10 MB
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml','image/heic','image/heif']
 where id in ('logos', 'fotos-empresas', 'fotos-produtos', 'fotos-feirantes', 'banners');
update storage.buckets set file_size_limit = 52428800,           -- 50 MB (há vídeo nas enquetes)
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','application/pdf','video/mp4','video/quicktime','video/webm']
 where id = 'uploads';
update storage.buckets set file_size_limit = 20971520,           -- 20 MB
       allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp']
 where id = 'fomento-materiais';

-- CONFERÊNCIA (só leitura) — rode depois:
-- select policyname, cmd from pg_policies where tablename in ('credenciais','push_subscriptions');
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets order by id;
