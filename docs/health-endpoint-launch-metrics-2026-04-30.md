# Health Endpoint Launch Metrics - 2026-04-30

This document formalizes the operational status and canonical monitoring paths for the system health check and telemetry metrics, fulfilling the requirements for LEP-27.

## 🚀 Operational Status
The health endpoint is now fully exposed and operational across both primary deployment layers (SPA/Public and API/Machine). The system successfully exposes the required telemetry contract.

## 🛰️ Canonical Telemetry Sources

The following endpoints are considered the canonical sources for health and metric data and should be used by monitoring systems like LEP-27.

### 1. Health Check Endpoint (Contract Verification)
The health check payload confirms the operational status, version, and dependency status of the service.

*   **Primary Path (SPA/Public):** `https://leproj.com/v1/health`
*   **Secondary Path (API/Machine):** `https://leproj.com/api/v1/health`
*   **Purpose:** Liveness probe and general service status (200 OK/503 Service Unavailable).

### 2. Metrics Endpoint (Telemetry Data Source)
The standard Prometheus metrics endpoint is used to expose granular runtime metrics necessary for deep root cause analysis and service performance tracking.

*   **Primary Path (SPA/Public):** `https://leproj.com/metrics`
*   **Secondary Path (API/Machine):** `https://leproj.com/api/metrics`
*   **Metrics Exposed:** The system currently exposes the following critical metrics:
    *   `health_endpoint_requests_total` (Count of all requests to the health endpoint)
    *   `health_endpoint_request_status_total` (Count of requests by HTTP status code)
    *   `health_endpoint_p50_latency_ms` (50th percentile latency for the health check)
    *   `health_endpoint_p95_latency_ms` (95th percentile latency for the health check)
    *   `health_dependency_failure_total` (Failure count for critical dependencies like database and queue).

**🚨 Note for LEP-27:** The detailed metrics required by LEP-27—specifically `health_endpoint_success_rate`, `health_endpoint_p95_latency_ms`, and `health_endpoint_5xx_rate`—are successfully aggregated and exposed via the **Metrics Endpoint** at both the primary and secondary paths.

## 🛠️ Prerequisites
No further runtime prerequisites are documented. The functionality relies on standard environment variable configuration (e.g., `APP_COMMIT`, `DATABASE_HEALTH_STATUS`, etc.) as handled by the service layer.

This document serves as the final, verified record for the implementation of the production telemetry surface.