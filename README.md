# LEP-7 Onboarding Repository Scaffold

This repository is the baseline scaffold for engineering onboarding delivery.

## Objective
Provide a consistent starting point for new contributors with:
- local environment bootstrap
- contribution standards
- CI entrypoint
- onboarding checklist

## Quick Start
```bash
./scripts/bootstrap.sh
make check
npm start
make hiring-metrics
make outbound-metrics
```

## Structure
- `.github/workflows/ci.yml`: baseline CI workflow
- `docs/onboarding/checklist.md`: onboarding execution checklist
- `docs/hiring/candidate-funnel-tracker.md`: hiring funnel tracker and weekly rollup process
- `docs/hiring/outbound-wave1-tracker.md`: sourcing + outbound wave tracker and rollup process
- `CONTRIBUTING.md`: contribution workflow and quality gates
- `Makefile`: common local commands
- `scripts/bootstrap.sh`: local setup script
- `scripts/weekly-hiring-metrics.sh`: weekly hiring metrics rollup
- `scripts/weekly-outbound-metrics.sh`: weekly outbound wave metrics rollup
- `package.json`: runtime manifest for local app execution
- `src/index.js`: baseline app entrypoint

## Acceptance Criteria
- Scaffold files exist and are internally consistent.
- Bootstrap and check commands are documented and executable.
- CI workflow can run basic linting and shell checks.
