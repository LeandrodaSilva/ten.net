# Deliverable 2 API Contracts

## Scope
This contract defines the stable API surface for Deliverable 2 core endpoints.

## Endpoint: `GET /v1/health`
Purpose: publish service health for platform readiness checks.

Production routing note:
- The runtime MUST serve this contract on both `/v1/health` and `/api/v1/health`.
- `/api/v1/health` is the canonical public production path when the app is mounted behind the site-wide `/api` backend route.

### Feature Flag
- Flags: `health_endpoint_v1_enabled` (runtime) and `HEALTH_ENDPOINT_V1_ENABLED` (compatibility)
- If flag is set to `false`, this endpoint is disabled.

### Request
- Method: `GET`
- Path: `/v1/health`
- Body: none

### Success Response
- Status: `200 OK` when dependencies are healthy
- Status: `503 Service Unavailable` when one or more dependencies are unhealthy
- Content type: `application/json`

Response body contract:
- `status`: `"ok" | "degraded"`
- `version`: string
- `commit`: string
- `deployedAt`: ISO-8601 datetime string
- `build`: object mirror for metadata compatibility
- `build.version`: string
- `build.commit`: string
- `build.deployedAt`: ISO-8601 datetime string
- `dependencies`: object
- `dependencies.database`: `"ok" | "error"`
- `dependencies.queue`: `"ok" | "error"`

Degraded criteria:
- If any dependency value is `error`, `status` MUST be `degraded` and HTTP status MUST be `503`.

Healthy criteria:
- If all dependency values are `ok`, `status` MUST be `ok` and HTTP status MUST be `200`.

### Disabled Response
When `HEALTH_ENDPOINT_V1_ENABLED=false`:
- Status: `404 Not Found`
- Content type: `application/json`
- Body:
  - `error.code`: `"not_found"`
  - `error.message`: `"resource not found"`

## Endpoint: fallback for unknown routes
Any unsupported route/method returns:
- Status: `404 Not Found`
- Content type: `application/json`
- Body:
  - `error.code`: `"not_found"`
  - `error.message`: `"resource not found"`

## Endpoint: `GET /metrics`
Purpose: export health endpoint runtime metrics in Prometheus text format.

### Request
- Method: `GET`
- Paths: `/metrics` and `/api/metrics`

### Response
- Status: `200 OK`
- Content type: `text/plain; version=0.0.4; charset=utf-8`
- Includes metric families:
  - `health_endpoint_requests_total`
  - `health_endpoint_request_status_total{status_code="..."}`
  - `health_endpoint_p50_latency_ms`
  - `health_endpoint_p95_latency_ms`
  - `health_dependency_failure_total{dependency="..."}`

## Stability Policy
For Deliverable 2, all field names, enum values, and error envelope keys above are treated as stable contract.
Any contract change requires:
1. updated contract tests,
2. updated contract document,
3. rollout communication in issue comments before deploy.
