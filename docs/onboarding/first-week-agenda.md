# First-Week Onboarding Agenda

## Goal
Give a new engineer a concrete day-by-day path from account activation to first merged change within the first week.

## Day 1
- Kickoff with CTO: architecture, product context, operating norms.
- Complete identity/access checks from `docs/environment-readiness-checklist.md`.
- Run local bootstrap and smoke commands:
  - `./scripts/bootstrap.sh`
  - `./scripts/check.sh`
- Review `README.md`, `CONTRIBUTING.md`, and `docs/onboarding-runbook.md`.

## Day 2
- Validate branch, commit, push, and PR flow on a small docs or tooling change.
- Walk through CI logs and expected review turnaround.
- Confirm logs/metrics/runbook access for primary service ownership.

## Day 3
- Pair with onboarding buddy on one debugging or incident-style exercise.
- Trace one issue from local reproduction through fix validation.
- Review rollback path and release gates for low-risk changes.

## Day 4
- Pick one scoped LEP-tagged issue with explicit acceptance criteria.
- Draft implementation approach and validation plan.
- Execute the change and request review.

## Day 5
- Incorporate review feedback and merge the first change.
- Capture one process/tooling improvement from the onboarding week.
- Week 1 check-in with CTO: confirm blockers, throughput, and next 2-week scope.

## Exit Criteria
- Local environment runs successfully without hidden setup debt.
- New hire can open and land a normal PR.
- New hire understands escalation path for access, CI, and runtime blockers.
