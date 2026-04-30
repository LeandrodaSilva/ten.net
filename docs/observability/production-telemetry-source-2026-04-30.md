# Production Telemetry Source Status (2026-04-30)

## Objective
Provide the canonical production telemetry source for the `GET /v1/health` 24h post-launch capture tracked by LEP-27.

## Verification Performed
Direct probes from the execution environment against the current production domain:

- `https://leproj.com/v1/health`
- `https://leproj.com/metrics`
- `https://leproj.com/api/v1/health`
- `https://leproj.com/api/metrics`

## Result
- `https://leproj.com/v1/health` returned the Paperclip web app HTML shell, not the v1 health JSON contract.
- `https://leproj.com/metrics` returned the Paperclip web app HTML shell, not Prometheus metrics.
- `https://leproj.com/api/v1/health` returned `404`.
- `https://leproj.com/api/metrics` returned `404`.

## Conclusion
There is no currently reachable production telemetry source for the health endpoint on the public production domain in the currently deployed build. The public backend route shape is already evident from the probes: `/api/*` reaches the application backend, while bare `/v1/health` and `/metrics` are captured by the SPA shell.

## Canonical Production Surface After LEP-42 Deploy
- Health contract URL: `https://leproj.com/api/v1/health`
- Metrics export URL: `https://leproj.com/api/metrics`
- Rationale: the backend is already mounted beneath `/api` in production, so the telemetry runtime must expose the health and metrics contracts on `/api`-prefixed aliases in addition to the root-local paths used during development.

## Validation Commands
Run after deploying the LEP-42 runtime change:

```bash
curl -i https://leproj.com/api/v1/health
curl -sS https://leproj.com/api/metrics | rg 'health_endpoint_(requests_total|request_status_total|p95_latency_ms)'
```

Expected results:
- `GET /api/v1/health` returns the documented JSON contract with HTTP `200` or `503`.
- `GET /api/metrics` returns Prometheus text including the health endpoint metric families required by LEP-27.

## Runtime Prerequisite
- Deploy the LEP-42 app build that exposes `/api/v1/health` and `/api/metrics` aliases in the Node runtime behind the existing production `/api` backend route.

## Required Unblock
One of the following must be provided before LEP-27 can complete:

1. A production service URL where `GET /v1/health` returns the documented JSON contract and `/metrics` exposes the health metric families.
2. A canonical internal telemetry query path that yields the 24h production values for:
   - `health_endpoint_success_rate`
   - `health_endpoint_p95_latency_ms`
   - `health_endpoint_5xx_rate`

## Execution Notes For LEP-27
Once the production source exists, the capture can complete without more discovery by recording:

- measurement window start/end timestamps
- source URL or query path used
- measured success rate
- measured p95 latency
- measured 5xx rate
- any auth or environment prerequisites required to rerun the query
