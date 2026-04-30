'use strict';

const http = require('node:http');
const {
  buildHealthPayload,
  createRequestHandler,
  isVersionedHealthRoute
} = require('./server');

const DEFAULT_PORT = Number(process.env.PORT || 3000);
const METRICS_ROUTE_PATHS = new Set(['/metrics', '/api/metrics']);

function createMetricsStore() {
  return {
    requestCount: 0,
    statusCodeCount: new Map(),
    dependencyFailureCount: new Map(),
    latencyMs: []
  };
}

function recordRequestMetrics(metrics, statusCode, latencyMs) {
  metrics.requestCount += 1;
  metrics.statusCodeCount.set(statusCode, (metrics.statusCodeCount.get(statusCode) || 0) + 1);
  metrics.latencyMs.push(latencyMs);
}

function recordDependencyFailures(metrics, dependencies) {
  Object.entries(dependencies).forEach(([name, state]) => {
    if (state !== 'ok') {
      metrics.dependencyFailureCount.set(name, (metrics.dependencyFailureCount.get(name) || 0) + 1);
    }
  });
}

function percentile(values, p) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(index, 0)];
}

function buildPrometheusMetrics(metrics) {
  const lines = [];

  lines.push('# HELP health_endpoint_requests_total Total requests seen by /v1/health');
  lines.push('# TYPE health_endpoint_requests_total counter');
  lines.push(`health_endpoint_requests_total ${metrics.requestCount}`);

  lines.push('# HELP health_endpoint_request_status_total Request count by HTTP status code');
  lines.push('# TYPE health_endpoint_request_status_total counter');
  for (const [statusCode, count] of metrics.statusCodeCount.entries()) {
    lines.push(`health_endpoint_request_status_total{status_code="${statusCode}"} ${count}`);
  }

  lines.push('# HELP health_endpoint_p50_latency_ms p50 latency for /v1/health in milliseconds');
  lines.push('# TYPE health_endpoint_p50_latency_ms gauge');
  lines.push(`health_endpoint_p50_latency_ms ${percentile(metrics.latencyMs, 50)}`);

  lines.push('# HELP health_endpoint_p95_latency_ms p95 latency for /v1/health in milliseconds');
  lines.push('# TYPE health_endpoint_p95_latency_ms gauge');
  lines.push(`health_endpoint_p95_latency_ms ${percentile(metrics.latencyMs, 95)}`);

  lines.push('# HELP health_dependency_failure_total Dependency check failures by dependency');
  lines.push('# TYPE health_dependency_failure_total counter');
  for (const [dependency, count] of metrics.dependencyFailureCount.entries()) {
    lines.push(`health_dependency_failure_total{dependency="${dependency}"} ${count}`);
  }

  return `${lines.join('\n')}\n`;
}

function getHealthEnv(env = process.env) {
  return {
    ...env,
    APP_COMMIT_SHA: env.APP_COMMIT || env.APP_COMMIT_SHA,
    DATABASE_HEALTH_STATUS: env.DEPENDENCY_DATABASE_OK === 'false' ? 'error' : 'ok',
    QUEUE_HEALTH_STATUS: env.DEPENDENCY_QUEUE_OK === 'false' ? 'error' : 'ok'
  };
}

function buildHealthResponse() {
  const payload = buildHealthPayload(getHealthEnv());
  const hasFailure = payload.status !== 'ok';

  return {
    httpStatus: hasFailure ? 503 : 200,
    body: payload
  };
}

function createApp() {
  const metrics = createMetricsStore();
  const baseRequestHandler = createRequestHandler(getHealthEnv());

  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && METRICS_ROUTE_PATHS.has(req.url)) {
      res.writeHead(200, { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' });
      res.end(buildPrometheusMetrics(metrics));
      return;
    }

    if (isVersionedHealthRoute(req)) {
      const start = process.hrtime.bigint();
      const health = buildHealthResponse();
      const elapsedMs = Number((process.hrtime.bigint() - start) / 1000000n);

      recordRequestMetrics(metrics, health.httpStatus, elapsedMs);
      recordDependencyFailures(metrics, health.body.dependencies);
    }

    baseRequestHandler(req, res);
  });

  return { server, metrics };
}

function startServer(port = DEFAULT_PORT) {
  const { server } = createApp();
  server.listen(port, () => {
    console.log(`server listening on :${port}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  buildHealthResponse,
  buildPrometheusMetrics,
  createApp,
  percentile,
  startServer
};
