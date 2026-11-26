#!/bin/bash
# -----------------------------------------------------------------------------
# "Ignored Build Step" da Vercel (configurado no vercel.json).
# Saída 0 = PULAR a publicação · saída 1 = PUBLICAR.
#
# Os quatro sites (Conecta, Sala, Fomento e Mais BB) saem do mesmo repositório,
# então toda mudança publicava os quatro e gastava o limite diário do plano
# gratuito. Aqui o Mais BB só publica quando muda algo que ele usa.
#
# Na dúvida, PUBLICA: sem VITE_SITE, sem o commit anterior ou com qualquer erro,
# o script sai com 1 — nunca deixa um site sem atualizar por engano.
# -----------------------------------------------------------------------------

[ "$VITE_SITE" = "maisbb" ] || exit 1
[ -n "$VERCEL_GIT_PREVIOUS_SHA" ] || exit 1
git cat-file -e "$VERCEL_GIT_PREVIOUS_SHA^{commit}" 2>/dev/null || exit 1

# Arquivos que o Mais BB usa (o resto — App.jsx, Sala*, Fomento* — não entra no site dele)
if git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" HEAD -- \
  src/maisbb src/central/motor.js src/central/ui.jsx src/central/dados.js src/supabaseClient.js src/main.jsx src/index.css src/sw.js \
  index.html vite.config.js tailwind.config.js postcss.config.js package.json package-lock.json \
  public api scripts vercel.json; then
  echo "Mais BB: nenhuma mudança nos arquivos dele — publicação pulada."
  exit 0
fi
echo "Mais BB: houve mudança nos arquivos dele — publicando."
exit 1
