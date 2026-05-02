# Health Endpoint Launch Metrics (2026-04-30)

## Scope
LEP-20 launch evidence for `GET /v1/health` and metric baselines using the local runtime as the minimal verification surface.

## Success Condition Used
- `GET /v1/health` responds with the v1 contract.
- Feature-flag-disabled path returns stable error envelope.
- Baseline and immediate post-enable synthetic measurements are captured.
- Follow-up 24h production window is explicitly tracked as a next action.

## Baseline (pre-rollout synthetic window)
Captured at 2026-04-30 UTC with the endpoint enabled for synthetic probes only.

- URL: `http://127.0.0.1:3999/v1/health`
- Sample size: `120`
- `health_endpoint_success_rate`: `100.000%`
- `health_endpoint_5xx_rate`: `0.000%`
- `health_endpoint_p95_latency_ms`: `1.130`
- `health_endpoint_avg_latency_ms`: `0.760`

## Post-enable (immediate synthetic launch window)
Captured immediately after baseline during the same rollout run.

- URL: `http://127.0.0.1:3999/v1/health`
- Sample size: `240`
- `health_endpoint_success_rate`: `100.000%`
- `health_endpoint_5xx_rate`: `0.000%`
- `health_endpoint_p95_latency_ms`: `0.819`
- `health_endpoint_avg_latency_ms`: `0.645`

## Runtime Metrics Snapshot
From `/metrics` after both windows:

- `health_endpoint_requests_total 360`
- `health_endpoint_request_status_total{status_code="200"} 360`
- `health_endpoint_p95_latency_ms 0`
- `health_dependency_failure_total` had no emitted dependency failures in this healthy run.

## Commands Used
```bash
npm test
PORT=3999 HEALTH_ENDPOINT_V1_ENABLED=true APP_VERSION=1.0.0 APP_COMMIT=lep20-launch APP_DEPLOYED_AT=2026-04-30T00:00:00.000Z node src/index.js
scripts/health-metrics-sample.sh http://127.0.0.1:3999/v1/health 120
scripts/health-metrics-sample.sh http://127.0.0.1:3999/v1/health 240
curl -sS http://127.0.0.1:3999/metrics
```

## Follow-up Required
A true 24h production post-launch measurement window still needs to be recorded from production telemetry after flag enablement in production.
