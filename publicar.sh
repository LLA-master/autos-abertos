#!/bin/sh
# Publica o que está commitado quando o histórico foi reescrito (datas, autor, purga de dados).
# Em dia normal não é preciso: basta "git push". Este script existe porque o ramo main é
# protegido contra reescrita, e a reescrita é justamente o que apaga rastro do histórico.
#
# O que ele faz, na ordem: remove a regra de proteção, envia, recria a regra.
set -e
cd "$(dirname "$0")"
R=repos/LLA-master/autos-abertos
find . -name '._*' -delete 2>/dev/null || true

ID=$(gh api $R/rulesets --jq '.[] | select(.name=="proteger-main") | .id' 2>/dev/null || true)
if [ -n "$ID" ]; then
  echo "removendo a proteção do ramo (temporário)…"
  gh api -X DELETE "$R/rulesets/$ID"
fi

echo "enviando…"
git push --force-with-lease origin main

echo "restaurando a proteção do ramo…"
gh api -X POST $R/rulesets --input - >/dev/null <<'JSON'
{"name":"proteger-main","target":"branch","enforcement":"active",
 "conditions":{"ref_name":{"include":["~DEFAULT_BRANCH"],"exclude":[]}},
 "rules":[{"type":"deletion"},{"type":"non_fast_forward"}]}
JSON

echo "pronto: $(git rev-parse --short HEAD) publicado, ramo protegido de novo"
