# Onboarding Runbook (Day 0-30)

## Objective
Enable a new engineering hire to become productive in the codebase, delivery workflow, and operations cadence within the first 30 days.

## Owners
- CTO: technical onboarding owner
- Hiring Manager: role expectations and delivery scope
- New Hire: executes checklist and raises blockers within 24h

## Pre-Day-1 (Hiring Manager + CTO)
- Confirm role scope and first-month success criteria are written and shared.
- Confirm access request bundle is prepared: source control, CI, cloud, secrets manager, incident tooling, internal docs, communication channels.
- Assign onboarding buddy (engineer peer).
- Pre-assign first 1-2 starter issues with clear acceptance criteria.

## Day 1
- Kickoff meeting: architecture overview, product context, and team operating norms.
- Account verification: all required systems accessible (see environment checklist).
- Local setup: bootstrap dev environment and run a minimal smoke test.
- Workflow walkthrough: issue lifecycle, branch strategy, code review expectations, deploy path.

Exit criteria:
- New hire can run app/tests locally.
- New hire can create branch, open PR, and request review.

## Days 2-7
- Complete a first low-risk production change behind normal review process.
- Shadow one incident/support rotation handoff.
- Review coding standards, security baseline, and release checklist.
- Pair once with onboarding buddy on debugging workflow.

Exit criteria:
- First PR merged.
- New hire demonstrates independent local debugging flow.

## Days 8-14
- Own one scoped feature or bugfix from triage to merge.
- Walk through CI failures and remediation process.
- Demonstrate use of logs/metrics/traces for one issue investigation.

Exit criteria:
- One independently delivered issue with test coverage aligned to team standard.

## Days 15-30
- Own a medium-scope task end-to-end (design note, implementation, validation).
- Participate in planning and effort estimation.
- Propose one improvement to tooling, docs, or runtime reliability.

Exit criteria:
- Consistent throughput across at least two completed issues.
- Demonstrated understanding of delivery and operational ownership.

## Weekly Cadence
- Week 1 check-in: unblock environment/tooling gaps.
- Week 2 check-in: assess delivery pace and review quality.
- Week 4 check-in: evaluate readiness for normal sprint load.

## Published Supporting Artifacts
- First-week agenda: `docs/onboarding/first-week-agenda.md`
- Environment readiness checklist: `docs/environment-readiness-checklist.md`
- Latest clean-environment dry run: `docs/onboarding/environment-dry-run-2026-04-30.md`

## Escalation Path
- Access/system blocker > 4 hours: escalate to CTO.
- Security/compliance blocker: escalate to security owner immediately.
- Infrastructure blocker: escalate to platform owner with issue link and impact.
