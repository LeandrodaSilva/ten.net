SHELL := /bin/bash

.PHONY: bootstrap check shellcheck markdownlint hiring-metrics outbound-metrics

bootstrap:
	./scripts/bootstrap.sh

check: shellcheck
	@echo "All checks passed."

hiring-metrics:
	@scripts/weekly-hiring-metrics.sh data/hiring/candidate-funnel.csv

outbound-metrics:
	@scripts/weekly-outbound-metrics.sh data/hiring/outbound-wave1.csv

shellcheck:
	@if command -v shellcheck >/dev/null 2>&1; then \
		shellcheck scripts/*.sh; \
	else \
		echo "shellcheck not installed; skipping shell lint."; \
	fi

markdownlint:
	@if command -v markdownlint >/dev/null 2>&1; then \
		markdownlint README.md CONTRIBUTING.md docs/onboarding/checklist.md; \
	else \
		echo "markdownlint not installed; skipping markdown lint."; \
	fi
