#!/bin/sh
# Commit sem digital: data em UTC, autor fixo, gancho de vazamento ligado.
# Uso: ./commitar.sh "mensagem"   ou   ./commitar.sh -F arquivo
cd "$(dirname "$0")" || exit 1
find . -name '._*' -delete 2>/dev/null
git config core.hooksPath .githooks
git config user.name "LLA-master"
git config user.email "LLA-master@users.noreply.github.com"
git config commit.gpgsign false
export TZ=UTC GIT_AUTHOR_DATE="$(date -u '+%Y-%m-%dT%H:%M:%S+0000')" GIT_COMMITTER_DATE="$GIT_AUTHOR_DATE"
exec git commit "$@"
