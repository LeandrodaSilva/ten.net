# Incident Response Runbook

## Scope
Use this runbook for service degradation, errors impacting users, or data-integrity concerns.

## Severity
- Sev 1: customer-visible outage or data-loss risk.
- Sev 2: major feature degraded with workaround.
- Sev 3: localized/non-critical issue.

## Roles
- Incident commander: on-call engineer (or CTO until on-call rotation exists)
- Communications owner: CTO
- Scribe: assigned responder

## Response Procedure
1. Acknowledge incident and assign commander.
2. Stabilize impact (rollback, feature flag off, or traffic shift).
3. Open incident notes with timeline (UTC timestamps).
4. Communicate status at 15-minute intervals for Sev 1/2.
5. Confirm recovery metrics and close active incident.

## Rollback Defaults
- Last known-good deployment rollback.
- Disable feature flags tied to active change.
- Revert offending commit if rollback path unavailable.

## Post-Incident
- Publish summary within 1 business day.
- Document root cause, customer impact, mitigations, and owners.
- Create and assign follow-up issues for prevention work.
