# Conecta Comércio — Ivatuba/PR

Plataforma de comércio local: site público, cadastro/login, painel administrativo
e painel do empresário. Feito em React + Vite + Tailwind, com Supabase como
backend (autenticação e banco de dados).

## Como colocar no ar (passo a passo)

### 1. Criar o banco (Supabase) — ~5 min
1. Acesse **supabase.com** → crie uma conta grátis → **New project**.
2. Anote a senha do banco que você definir (não precisa dela depois, só guarde).
3. Quando o projeto terminar de criar, vá em **SQL Editor** → **New query**.
4. Cole o conteúdo do arquivo `supabase-schema.sql` (fornecido junto com este
   projeto) e clique em **Run**. Isso cria todas as tabelas e as regras de
   segurança.
5. Vá em **Authentication → Providers** e confirme que **Email** está habilitado
   (vem habilitado por padrão).
6. Vá em **Project Settings → API**. Copie:
   - **Project URL**
   - **anon public key**

### 2. Conectar o projeto às suas chaves
1. Na pasta do projeto, copie o arquivo `.env.example` para um novo arquivo
   chamado `.env`.
2. Cole a URL e a chave que você copiou no passo anterior:
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon
   ```

### 3. Testar localmente (opcional, mas recomendado)
Com Node.js instalado no seu computador:
```bash
npm install
npm run dev
```
Abra o endereço que aparecer no terminal (algo como `http://localhost:5173`).
Teste criar uma conta — ela já vai cair de verdade no seu banco Supabase.

### 4. Publicar (deploy) — ~5 min
Forma mais simples, sem precisar de servidor próprio:
1. Suba esta pasta para um repositório novo no **GitHub**.
2. Acesse **vercel.com** (ou **netlify.com**) → **Add New Project** → importe
   esse repositório.
3. Em **Environment Variables**, adicione as mesmas duas variáveis do `.env`
   (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`).
4. Clique em **Deploy**. Em cerca de 1 minuto você recebe um endereço público,
   por exemplo `conecta-comercio-ivatuba.vercel.app`.
5. Se quiser um domínio próprio (ex: `comercio.ivatuba.pr.gov.br` ou um domínio
   novo comprado à parte), isso é configurado em **Project Settings → Domains**
   na Vercel/Netlify — é só apontar o DNS conforme a instrução que eles mostram.

### 5. Ativar o chatbot com IA (opcional)
O botão flutuante de assistente já está pronto na plataforma. Para ele
responder de verdade:
1. Acesse **console.anthropic.com** → crie uma conta → **Get API Keys** →
   **Create Key**. Copie a chave (começa com `sk-ant-...`).
2. Adicione um pequeno saldo em **Billing** (o uso de um chatbot para uma
   cidade pequena costuma custar poucos reais por mês).
3. No seu `.env` local, adicione:
   ```
   ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui
   ```
4. Na Vercel/Netlify, adicione essa mesma variável em **Environment Variables**
   (sem o prefixo `VITE_` — ela precisa ficar só no servidor, nunca exposta
   no navegador, por isso o código já separa isso automaticamente).
5. Publique de novo (redeploy). O botão de assistente (ícone de estrela, canto
   inferior direito) passa a responder perguntas sobre empresas, produtos,
   vagas, cursos e a Sala do Empreendedor.

Sem essa chave configurada, o botão continua visível, mas avisa educadamente
que a IA ainda não foi conectada — nada quebra.

### 6. Cadastrar usuários direto pelo painel admin (necessário para essa função)
O admin agora pode criar contas (cliente, empresário ou admin) direto pelo painel,
sem precisar que a pessoa se cadastre sozinha. Isso usa um endpoint de servidor que
precisa da **chave secreta** do Supabase:
1. No Supabase, vá em **Project Settings → API Keys** e copie a **Secret key**
   (formato `sb_secret_...`) — é diferente da chave pública usada no passo 1.
2. Na Vercel/Netlify, adicione a variável de ambiente:
   ```
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_sua-chave-aqui
   ```
   **Importante**: essa variável NUNCA deve ter o prefixo `VITE_` — se tiver, ela fica
   exposta no navegador para qualquer visitante ver, o que é um risco de segurança grave.
3. Publique de novo (redeploy).

Sem essa chave, o cadastro de usuário pelo admin mostra uma mensagem avisando que o
Supabase ainda não foi configurado no servidor — o resto do site continua normal.

### 7. Imagem ilustrativa de produto por IA (opcional)
No cadastro de produto, se o comerciante ainda não tiver uma foto, ele pode gerar
uma **imagem ilustrativa** — sempre marcada com um selo "IA", nunca apresentada
como foto real. Isso usa a API de imagens da OpenAI (a Anthropic não gera imagens):
1. Acesse **platform.openai.com** → crie uma conta → **API Keys** → **Create new secret key**
2. Adicione um pequeno saldo em **Billing**
3. Adicione `OPENAI_API_KEY=sk-...` no seu `.env` e nas variáveis de ambiente da Vercel
4. Publique de novo

Sem essa chave, essa função específica fica desativada (o chatbot e a descrição
por IA continuam funcionando normalmente, pois usam só a Anthropic).

### O que já funciona de verdade
- Cadastro de conta (cliente ou empresário) grava no Supabase Auth + tabela `perfis`
- Empresário que se cadastra já cria um registro em `empresas` com status `pendente`
- Login real por e-mail e senha
- **Links diretos de acesso**: o administrador entra por `seusite.com/#/admin` e o
  empresário (vendedor) por `seusite.com/#/empresa` — são links reais, dá pra copiar
  e mandar por WhatsApp. Quem visita o site em `/` (sem nada depois) navega e usa
  tudo sem precisar se cadastrar; só cai numa tela de login se tentar abrir um
  desses dois painéis
- Listagem de empresas na home busca da tabela `empresas` (aprovadas); enquanto
  não houver nenhuma aprovada, mostra dados de exemplo para a página não ficar vazia
- Chatbot com IA (botão flutuante) — funciona assim que a `ANTHROPIC_API_KEY` for configurada
- No cadastro de produto (Painel Empresário), a ferramenta de IA já está ativa: gera a
  descrição de vendas, dá dicas sobre a foto real enviada e pode gerar uma imagem
  ilustrativa opcional — usa a `ANTHROPIC_API_KEY` (e `OPENAI_API_KEY` só para a imagem)
- Painéis Admin e Empresário exigem login: quem não estiver logado é levado para a
  tela de Entrar/Cadastro automaticamente, e só entra quem tiver o perfil certo
  (`tipo = 'admin'` ou `tipo = 'empresario'` na tabela `perfis`)
- **Editar perfil (Painel Empresário)**: nome, WhatsApp, Instagram, endereço e horário
  de atendimento agora leem e gravam de verdade na tabela `empresas`
- **Painel Admin — Comerciantes**: aprovar, recusar e editar empresa gravam no banco
- **Painel Admin — Produtos**: publicar/despublicar e remover gravam no banco
- **Painel Admin — Feira do Empreendedor**: editar a feira regular (dia/horário/local),
  cadastrar e divulgar feiras especiais, e aprovar/recusar cadastros de feirante
- **Painel Admin — Calendário de eventos**: cadastro completo (criar/remover) de eventos;
  só o administrador edita, e o calendário aparece no site principal para todo mundo ver
- **Painel Admin — Banners**: upload real de foto (Supabase Storage), título, link,
  ordem e ativo/inativo — tudo grava na tabela `banners`
- **Painel Admin — Cadastrar usuário**: cria conta de cliente, empresário ou admin
  direto pelo painel (usa o endpoint `api/admin-criar-usuario`, precisa da
  `SUPABASE_SERVICE_ROLE_KEY` — veja o passo 6); se for empresário, pode cadastrar a
  empresa junto na hora
- **Painel Admin — Notícias**: cadastro com foto e link, aparece por ordem de publicação
- **Painel Admin — Vagas**: cadastro de vaga vinculada a uma empresa existente
- **Painel Admin — Notificações**: envio com foto e link, fica salvo no histórico
- **Painel Admin — Feiras especiais**: cadastro agora aceita foto e link de divulgação
- **Painel Admin — Feirantes**: além de aprovar/recusar quem se cadastrou pelo site, o
  admin pode cadastrar um feirante direto (com foto) já aprovado, aparecendo na hora
- **Painel Admin — Produtos**: além de moderar, o admin pode cadastrar um produto novo
  direto para qualquer empresa (com foto)
- **Painel Admin — Identidade do site**: cor principal, logo e frase de destaque da home
  são editáveis pelo admin e aplicados no site inteiro
- **Painel Admin — Enquetes**: cadastro real (pergunta + até 3 opções), encerrar/reabrir e remover
- **Cadastro de empresa (público)**: agora tem upload real de logo; o admin também pode
  trocar a logo de qualquer empresa na moderação
- **Painel do Empresário — Meus produtos**: lista os produtos reais (com foto), permite
  publicar/despublicar e remover; "Novo produto" já atualiza a lista na hora

### O que ainda é só interface (próximo passo)
- Painel do empresário: promoções, visualizações, editar detalhes de um produto já existente
  (hoje dá para publicar/despublicar/remover, mas não para trocar nome/preço/foto depois de criado)

Esses pontos já têm todo o design pronto — falta ligar cada ação aos comandos
do Supabase (a mesma lógica usada nos painéis já ativados serve de modelo). Me
chame quando quiser seguir com isso.

### Depois de atualizar o banco
Se você já tinha rodado o `supabase-schema.sql` antes, ele vai reclamar de tabelas que
já existem (`create table` dá erro "already exists" se a tabela já estiver lá). Isso é
normal — o jeito mais simples é rodar o arquivo inteiro de novo e, se aparecer erro em
alguma tabela específica, pular só aquele bloco e continuar colando o resto. As
novidades desta rodada são: colunas `imagem_url`/`link_url` em `noticias`,
`notificacoes` e `eventos_calendario`; a tabela nova `site_config` (identidade visual);
e novas políticas de RLS para admin gerenciar banners, notícias, notificações,
feirantes e vagas diretamente.
