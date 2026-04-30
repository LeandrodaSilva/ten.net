# Engineering Operating Baseline (M2 Day 31-60)

## Purpose
Define the minimum quality bar for code review, CI, and operational ownership.

## PR Quality Bar
A pull request is review-ready only if:
- Problem statement and scope are clear in the PR description.
- Validation steps are listed and reproducible.
- Risk and rollback are documented.
- User-facing or operational behavior changes are documented.

Use `.github/pull_request_template.md` for all PRs.

## Review SLA
- Author response SLA: same business day for reviewer questions posted before 3pm local time; next business day otherwise.
- Reviewer first-response SLA: within 1 business day.
- Escalation owner for SLA misses: CTO.

## Ownership Model
- CTO is required reviewer for:
  - CI/workflow changes under `.github/workflows/`
  - Operational runbook changes under `docs/runbooks/`
- Authors own:
  - Correctness and tests for submitted change
  - Rollback plan quality
  - Follow-up issue creation for deferred work

## CI Required Checks for `main`
Required status checks to configure in GitHub branch protection:
- `quality-gate`

Branch protection settings expected:
- Require pull request before merge
- Require status checks to pass before merge (`quality-gate`)
- Require conversation resolution before merge
- Restrict force pushes to `main`

## Runbooks and Operational Readiness
- Incident runbook: `docs/runbooks/incident-response.md`
- Dry-run evidence: `docs/runbooks/incident-dry-run-2026-04-30.md`
