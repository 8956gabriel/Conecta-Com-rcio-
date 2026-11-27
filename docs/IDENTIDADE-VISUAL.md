# Guia de identidade visual — Conecta Comércio, Sala do Empreendedor e Fomento Paraná

Projeto Master · seção 4 e Fase 3. Referência para qualquer tela nova ou alteração.
Regra principal: **modernizar sem descaracterizar** — cada ambiente precisa ser
reconhecido de imediato pela logo e pelas cores.

## 1. Regras comuns aos três ambientes

| Item | Padrão |
|---|---|
| Fonte de títulos | **Manrope** (classe `font-display`), pesos 700–900 |
| Fonte de textos, menus, botões e formulários | **Inter** (classe `font-body`), pesos 400–700 |
| Carregamento das fontes | Google Fonts, em `src/App.jsx` (`fontImport`) |
| Cantos | Cartões `rounded-2xl`; botões, campos e itens de menu `rounded-xl` ou `rounded-lg`; etiquetas `rounded-full` |
| Bordas | 1 px, cor de linha do ambiente |
| Texto de apoio | cinza-azulado (`muted`) do ambiente |
| Navegação dos painéis | menu lateral à esquerda: fixo e recolhível no computador, gaveta/botão "Menu" no celular, itens agrupados por categoria (`src/shared/PainelLateral.jsx` e `MenuLateralPainel` em `src/App.jsx`) |
| Ícones | lucide-react, 14–18 px nos menus e botões |
| Crédito | "Desenvolvedor: Gabriel Oliveira" no rodapé de todas as páginas |

Botões, em todos os ambientes:
- **Principal:** fundo na cor principal do ambiente, texto branco, `font-body` bold.
- **Secundário (contorno):** fundo branco, borda na cor de linha, texto cinza-escuro `#425A70`.
- **Perigo:** texto ou fundo `#B4462F` / `#B42318`.
- **Desabilitado / salvando:** opacidade 0,6 e texto "Salvando...".

Estados (etiquetas): verde `#1E8E5A` em `#E6F5EC` (ativo/publicado) · cinza `#5C7186` em
`#F1F4F8` (oculto) · âmbar `#8A5A12` em `#FFF6E9` (em preparação/atenção) · vermelho
`#B42318` em `#FDECEC` (desativado/erro).

## 2. Conecta Comércio (portal e Administração geral)

| Papel | Cor |
|---|---|
| Principal | `#0A5AA8` (editável pelo admin em Identidade do site → vira `--cor-principal`) |
| Escura / profunda | calculadas a partir da principal (`--cor-principal-escura`, `--cor-principal-profunda`, padrão `#052A4D`) |
| Fundo suave | `#EAF2FB` e `#F5F9FD` |
| Destaque | âmbar `#E8A23D` / `#C6811F` |
| Texto | `#0E2233` · apoio `#5C7186` |
| Linha | `#DCE7F2` |

- **Logo:** a enviada em Painel Admin → Identidade do site (`site_config.logo_url`); sem ela, a marca "ConectaComércio" desenhada no código (`LogoMark`).
- A **Administração geral** usa a identidade do Conecta e mostra o setor selecionado no menu.

## 3. Sala do Empreendedor

| Papel | Cor |
|---|---|
| Principal (azul-marinho da logo) | `#0B2474` · profunda `#06164A` |
| Destaque (laranja da logo) | `#F29E72` · fundo `#FDF1EA` |
| Fundo suave | `#ECEFF8` e `#F7F8FC` |
| Texto | `#14213D` · apoio `#4A5578` |
| Linha | `#E1E5EF` |

- **Logo:** `public/sala-do-empreendedor-logo.png` (ou a enviada na configuração da Sala).
- As cores são **fixas**: não mudam quando a cor principal do Conecta é trocada.
- Arquivos: `src/SalaEmpreendedor.jsx` (constante `S`), `src/SalaSite.jsx`.

## 4. Fomento Paraná

| Papel | Cor |
|---|---|
| Principal (azul da logo, escurecido para contraste 5,6:1 com texto branco) | `#006DAB` · azul original da logo `#0080C9` · profundo `#003F66` |
| Destaque (amarelo da logo) | `#FFDD00` · fundo `#FFF8CC` — texto escuro por cima, nunca branco |
| Verde da logo | `#879D0E` |
| Fundo suave | `#E6F2FA` e `#F4F9FC` |
| Texto | `#1A1A1A` · apoio `#5C5C5C` |
| Linha | `#E2E5D6` |

- **Logo:** `public/fomento-parana-logo.png`, sempre sobre fundo branco (no cabeçalho azul, dentro de um selo branco arredondado). Não recortar, esticar nem recolorir.
- As cores são **fixas**, independentes do Conecta.
- Arquivos: `src/FomentoParana.jsx` (constante `F`), `src/FomentoSite.jsx`.

## 5. Logomarcas — cuidados

- Usar sempre os arquivos originais acima; nunca uma logo genérica.
- Não redesenhar, distorcer, recortar ou trocar as cores das marcas.
- Altura mínima: 28 px em cabeçalhos e menus; manter a proporção (`w-auto`).
- Cada ambiente mostra **a sua** logo no topo do menu lateral e no cabeçalho.

## 6. Onde mudar

| O quê | Onde |
|---|---|
| Cor e logo do Conecta | Painel Admin → Identidade do site (sem mexer no código) |
| Cores da Sala | `const S` em `src/SalaEmpreendedor.jsx` e `AZUL/LARANJA` em `src/SalaSite.jsx` |
| Cores da Fomento | `const F` em `src/FomentoParana.jsx` e `AZUL/AMARELO` em `src/FomentoSite.jsx` |
| Fontes | `fontImport` em `src/App.jsx` |
| Menu lateral | `src/shared/PainelLateral.jsx` (Sala e Fomento) e `MenuLateralPainel` / Painel Admin em `src/App.jsx` |
