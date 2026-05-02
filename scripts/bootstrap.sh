#!/usr/bin/env bash
set -euo pipefail

printf 'Bootstrapping onboarding scaffold...\n'

missing=0
for cmd in bash npm; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$cmd"
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  printf 'Bootstrap failed due to missing prerequisites.\n'
  exit 1
fi

if command -v make >/dev/null 2>&1; then
  printf 'Optional convenience command available: make\n'
else
  printf 'Optional convenience command unavailable: make (direct scripts still supported)\n'
fi

printf 'Bootstrap complete.\n'
