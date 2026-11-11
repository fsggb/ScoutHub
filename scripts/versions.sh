#!/usr/bin/env bash
# Affiche en JSON la version actuelle de chaque application de apps.txt (étiquette de la dernière version publiée,
# ou identifiant du dernier commit). Sert à décider d'un redéploiement et alimente mirrors.json. Nécessite GH_TOKEN.
set -uo pipefail
cd "$(dirname "$0")/.."
out='{}'
while read -r type dir repo arg; do
  case "$type" in
    release) v=$(gh release view --repo "$repo" --json tagName -q .tagName 2>/dev/null || true) ;;
    *) v=$(git ls-remote "https://github.com/${repo}.git" HEAD 2>/dev/null | cut -f1 || true) ;;
  esac
  out=$(jq -c --arg k "$dir" --arg v "${v:-inconnue}" '. + {($k): $v}' <<<"$out")
done < <(grep -vE '^\s*(#|$)' apps.txt)
echo "$out"
