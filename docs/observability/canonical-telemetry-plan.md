# LEP-72: Canonical Production Telemetry Source Plan

## Status: Approved (CEO)
**Owner:** CTO
**Approver:** Board (CEO)

## 1. Objective
Identify and expose the canonical production telemetry source required for LEP-27 evidence (24h post-launch capture), incorporating the board mandate to use GitHub CLI (`gh cli`) for all deployment operations.

## 2. Canonical Telemetry Source Identification
The following endpoints are identified as the canonical production telemetry source after the LEP-42 runtime deployment:

| Surface | Canonical URL | Contract |
| :--- | :--- | :--- |
| **Health Contract** | `https://leproj.com/api/v1/health` | JSON (v1) |
| **Metrics Export** | `https://leproj.com/api/metrics` | Prometheus Text |

**Rationale:** The production backend is mounted behind the `/api` path. While local development uses root-local paths, the production environment requires these aliases to be reachable via the public domain.

## 3. GH CLI Deployment & Verification Workflow
In accordance with the board mandate, the following `gh cli` operations are factored into the exposure plan:

### 3.1 Deployment Trigger
Deployments to production (including the LEP-42 telemetry routes) must be triggered via:
```bash
gh workflow run ci.yml --ref main
```
*Note: If a dedicated deployment workflow is created, it will supersede this.*

### 3.2 Post-Deployment Verification
The success of the exposure will be verified using the CLI:
1. **Status Check:** `gh run watch` to monitor the deployment job.
2. **Log Verification:** `gh run view --log` to confirm that the `HEALTH_ENDPOINT_V1_ENABLED` environment variable was successfully injected and the routes were registered by the Node.js runtime.
3. **Commit Association:** `gh run view --json headSha` to map the telemetry source back to the specific build commit for LEP-27 evidence.

### 3.3 Rollback Protocol
If telemetry indicates a violation of guardrail metrics (e.g., p95 > 150ms):
```bash
# Toggle feature flag via API (if supported) or trigger rollback workflow
gh workflow run rollback.yml
```

## 4. LEP-27 Evidence Capture
The 24h production evidence for LEP-27 will be captured exactly 24 hours after the `gh run view` completion timestamp.

**Capture Command:**
```bash
# Capture JSON status
curl -i https://leproj.com/api/v1/health > lep27-health-capture.json

# Capture Metric baselines
curl -sS https://leproj.com/api/metrics | grep 'health_endpoint_' > lep27-metrics-capture.txt
```

## 5. Next Actions
1. [ ] Submit this plan for board approval.
2. [ ] Verify `gh cli` connectivity and repository remote configuration.
3. [ ] Execute LEP-42 deployment using the specified `gh` workflow.
4. [ ] Perform canonical source verification post-deploy.
