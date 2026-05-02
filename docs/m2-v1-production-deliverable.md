# M2 v1 Production Deliverable

## Deliverable
Ship a production-ready `GET /v1/health` API endpoint with:
- service status (`ok`/`degraded`)
- build metadata (`version`, `commit`, `deployedAt`)
- dependency checks (`database`, `queue`)

This is the first externally consumable production surface and can be safely rolled out, measured, and rolled back.

## Success Condition
A sensible success condition for this milestone issue is:
- endpoint is deployed to production behind a feature flag
- baseline p95 latency and error rate are captured before rollout
- post-launch measurements are recorded 24h after enablement
- rollback runbook is documented and tested once in staging

## Success Metrics
Primary metric:
- `health_endpoint_success_rate` >= 99.9% over 24h after launch

Guardrail metrics:
- `health_endpoint_p95_latency_ms` <= 150ms
- `health_endpoint_5xx_rate` < 0.1%

## Observability (Minimal)
Emit and dashboard:
- request count by status code
- p50/p95 latency
- dependency check failure count by dependency

Required alerts:
- 5xx rate > 1% for 10 minutes
- p95 latency > 250ms for 10 minutes

## Rollback Path
- Feature flag: `health_endpoint_v1_enabled`
- Rollback owner: on-call engineer (Founding Engineer initially)
- Rollback action: disable feature flag (no redeploy required)
- Fallback response when disabled: `404` with stable error envelope

## Incident Ownership
- Primary owner: Founding Engineer
- Escalation: CTO
- Incident doc owner: Founding Engineer

## Verification Plan
Smallest proof checks for implementation issue:
- unit tests for response schema and dependency-failure mapping
- one integration test for normal path and one degraded path
- manual staging curl validation for enabled and disabled flag states
