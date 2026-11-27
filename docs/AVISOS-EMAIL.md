# Avisos por e-mail — como ligar

Três avisos automáticos (Projeto Master · seção 19):

| Quando | Quem recebe (variável na Vercel) |
|---|---|
| Novo pedido de atendimento na Sala (inclusive encaminhado pela Fomento) | `AVISO_EMAIL_SALA` |
| Novo interessado na Fomento (inclusive encaminhado pela Sala) | `AVISO_EMAIL_FOMENTO` |
| Empresa nova aguardando aprovação | `AVISO_EMAIL_ADMIN` |

Serviço: **Resend**, plano gratuito (3.000 e-mails/mês, 100/dia). Enquanto não estiver configurado, nada é enviado e nada quebra.

## Passo a passo (uma vez só)

1. **Conta no Resend** — crie em https://resend.com (gratuita).
2. **Domínio** — no Resend, *Domains → Add domain* → `conectacomercio.app.br`. Ele mostra alguns registros de DNS (MX/TXT); cadastre-os onde o domínio é administrado e clique em *Verify*.
3. **Chave** — no Resend, *API Keys → Create API key* (permissão *Sending access*). Copie.
4. **Vercel** → projeto **conecta-com-rcio** → *Settings → Environment Variables* (ambiente *Production*):
   - `RESEND_API_KEY` = a chave do passo 3
   - `AVISO_SEGREDO` = uma senha longa inventada (ex.: 30 letras e números aleatórios)
   - `AVISO_EMAIL_SALA`, `AVISO_EMAIL_FOMENTO`, `AVISO_EMAIL_ADMIN` = os e-mails (vários: separe por vírgula)
   - depois, *Deployments → Redeploy* da última publicação.
5. **Supabase** → SQL Editor: rode `supabase-avisos-email.sql` e depois
   `update public.avisos_config set segredo = 'O-MESMO-AVISO_SEGREDO', ativo = true where id = 1;`
6. **Teste** — faça um pedido de atendimento na página pública da Sala; o e-mail deve chegar em até 1 minuto.

Pausar tudo: `update public.avisos_config set ativo = false where id = 1;`

## O que vai no e-mail
Nome, WhatsApp, assunto/serviço e o botão para o painel. CPF/CNPJ (`documento`) e históricos **não** são enviados.
