#!/usr/bin/env bash
set -euo pipefail

printf 'Running onboarding validation checks...\n'

if command -v shellcheck >/dev/null 2>&1; then
  shellcheck scripts/*.sh
else
  printf 'shellcheck not installed; skipping shell lint.\n'
fi

npm test

printf 'All checks passed.\n'
