# Como lançar o Conecta Comércio em uma nova cidade

Processo pra criar uma cópia independente da plataforma para outra prefeitura/cidade,
com banco de dados e domínio próprios (sem misturar dados com Ivatuba).

## 1. Duplicar o código

1. No GitHub, use "Use this template" ou faça um fork do repositório
   `8956gabriel/Conecta-Com-rcio-` com um novo nome (ex: `Conecta-Comercio-NomeDaCidade`).
2. Clone o novo repositório localmente.

## 2. Trocar os textos fixos da cidade

O nome "Ivatuba" (e frases relacionadas) aparecem escritos diretamente no código em
alguns lugares — não vêm todos do banco de dados. Arquivos a revisar e ajustar:

- `src/App.jsx` — cerca de 60 ocorrências (textos de rodapé, título da home,
  descrições, SEO). Buscar por "Ivatuba" e trocar pelo nome da nova cidade.
- `index.html` — título da página, meta description, meta tags de compartilhamento.
- `vite.config.js` — nome e descrição do app no manifest do PWA (seção `VitePWA`).
- `api/chat.js` — o `SYSTEM_PROMPT` do assistente de IA menciona Ivatuba; ajustar
  pro contexto da nova cidade.
- `api/gerar-descricao.js` — revisar se cita a cidade.
- `README.md` — não afeta o site, mas bom manter atualizado.

Também trocar: logo, cor principal, telefone/endereço da Sala do Empreendedor,
frase de topo — a maior parte disso já é editável depois pelo próprio admin em
"Identidade" (tabela `site_config`), então pode deixar em branco/genérico no
código e configurar depois direto no painel.

## 3. Criar um novo projeto Supabase

1. Criar um novo projeto no Supabase (não reaproveitar o de Ivatuba — dados de
   cidades diferentes não podem se misturar).
2. Rodar o arquivo `supabase-schema.sql` no novo projeto (SQL Editor do Supabase)
   para criar todas as tabelas, funções e políticas de RLS do zero.
3. Copiar a nova `URL` e `anon key` do projeto para um `.env` local
   (baseado em `.env.example`).
4. Se o assistente de IA for usado, gerar uma chave própria da Anthropic
   (ou reaproveitar a mesma, se o custo for por conta única).

## 4. Publicar

1. Criar um novo projeto na Vercel a partir do novo repositório GitHub.
2. Configurar as variáveis de ambiente de produção na Vercel:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `ANTHROPIC_API_KEY` (se aplicável).
3. Registrar/configurar o domínio da nova cidade (próprio, ou como um caminho
   dentro de `conectacomercio.app.br`, dependendo do que for combinado
   comercialmente).

## 5. Configurar dados iniciais

Depois de publicado, entrar no Painel Admin da nova cidade e preencher:
- Identidade (nome, logo, cor, frase)
- Categorias de empresas
- Ao menos uma conta de admin

## O que NÃO precisa duplicar

O código de funcionalidades (PDV... digo, cadastro de empresas, feira, cursos,
calendário, credenciamento, ouvidoria etc.) já funciona igual pra qualquer
cidade — só precisa dos dados e configurações próprios de cada uma.

## Observação sobre escala

Esse processo cria uma cópia **totalmente separada** por cidade (código, banco,
domínio). Funciona bem para poucas cidades. Se no futuro isso crescer para
dezenas de prefeituras, vale reavaliar migrar para uma arquitetura multi-tenant
única (uma coluna de cidade nas tabelas, um só banco/deploy) — mas isso é um
projeto grande, só vale a pena com escala real.
