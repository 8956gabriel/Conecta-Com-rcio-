-- =============================================================================
-- LIGA / DESLIGA NO SITE PÚBLICO
-- Guarda o que o administrador ocultou no site (Votação, Fomento, Sala,
-- seções da página inicial, itens do menu e botões). Formato:
--   { "votacao": false, "faq": false, ... }  -> só o que estiver false some.
-- Painel Admin → Administração → Módulos do site.
--
-- Como usar: Supabase → SQL Editor → cole este arquivo inteiro → Run.
-- Pode rodar mais de uma vez sem problema.
-- =============================================================================
alter table public.site_config
  add column if not exists visibilidade jsonb not null default '{}'::jsonb;
