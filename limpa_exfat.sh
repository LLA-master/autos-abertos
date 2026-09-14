#!/bin/zsh
# Remove os arquivos AppleDouble (._*) que o macOS cria em volumes exFAT e que corrompem o .git.
cd "$(dirname "$0")" && find . -name '._*' -delete && echo "limpo"
