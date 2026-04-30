# Deliverable 2 Rollout Checklist

## Release Scope
- [ ] Deploy `GET /v1/health` and `/metrics` support to production runtime.
- [ ] Confirm `HEALTH_ENDPOINT_V1_ENABLED` remains `false` at deploy time.

## Pre-Rollout
- [ ] Confirm contract tests pass on release commit.
- [ ] Confirm `APP_VERSION`, `APP_COMMIT`, and `APP_DEPLOYED_AT` are configured.
- [ ] Confirm alert rules are present for 5xx and latency thresholds.
- [ ] Capture baseline metrics before enabling flag:
  - [ ] p95 latency
  - [ ] 5xx rate
  - [ ] dependency failure counts

## Rollout
- [ ] Enable `HEALTH_ENDPOINT_V1_ENABLED=true`.
- [ ] Validate `GET /v1/health` returns `200` and expected JSON schema.
- [ ] Validate `/metrics` includes health endpoint metric families.

## Post-Rollout (24h)
- [ ] Confirm success rate >= 99.9%.
- [ ] Confirm p95 latency <= 150ms.
- [ ] Confirm 5xx rate < 0.1%.
- [ ] Record results in issue comment for readiness review.

## Rollback
- [ ] If thresholds breach, set `HEALTH_ENDPOINT_V1_ENABLED=false`.
- [ ] Confirm disabled response returns stable `feature_disabled` envelope.
- [ ] Open incident summary and notify CTO.
