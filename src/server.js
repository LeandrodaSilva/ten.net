'use strict';

const DEFAULT_VERSION = '0.1.0';
const HEALTH_FLAG_NAME = 'health_endpoint_v1_enabled';
const HEALTH_ROUTE_PATHS = new Set(['/v1/health', '/api/v1/health']);
const BOOTSTRAP_HEALTH_ROUTE_PATHS = new Set(['/health']);

function envFlagEnabled(rawValue) {
  return rawValue === '1' || rawValue === 'true';
}

function getDependencyStatus(env = process.env) {
  return {
    database: env.DATABASE_HEALTH_STATUS || 'ok',
    queue: env.QUEUE_HEALTH_STATUS || 'ok'
  };
}

function buildHealthPayload(env = process.env) {
  const dependencies = getDependencyStatus(env);
  const status = Object.values(dependencies).every((value) => value === 'ok') ? 'ok' : 'degraded';
  const version = env.APP_VERSION || DEFAULT_VERSION;
  const commit = env.APP_COMMIT_SHA || 'unknown';
  const deployedAt = env.APP_DEPLOYED_AT || new Date().toISOString();

  return {
    status,
    version,
    commit,
    deployedAt,
    build: {
      version,
      commit,
      deployedAt
    },
    dependencies
  };
}

function getStableNotFoundResponse() {
  return {
    error: {
      code: 'not_found',
      message: 'resource not found'
    }
  };
}

function isBootstrapHealthRoute(req) {
  return req.method === 'GET' && BOOTSTRAP_HEALTH_ROUTE_PATHS.has(req.url);
}

function isVersionedHealthRoute(req) {
  return req.method === 'GET' && HEALTH_ROUTE_PATHS.has(req.url);
}

function createRequestHandler(env = process.env) {
  return function requestHandler(req, res) {
    if (isBootstrapHealthRoute(req)) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (isVersionedHealthRoute(req)) {
      if (!envFlagEnabled(env[HEALTH_FLAG_NAME] || env.HEALTH_ENDPOINT_V1_ENABLED)) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify(getStableNotFoundResponse()));
        return;
      }

      const payload = buildHealthPayload(env);
      const httpStatus = payload.status === 'ok' ? 200 : 503;
      res.writeHead(httpStatus, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify(getStableNotFoundResponse()));
  };
}

module.exports = {
  buildHealthPayload,
  createRequestHandler,
  envFlagEnabled,
  getDependencyStatus,
  getStableNotFoundResponse,
  isBootstrapHealthRoute,
  isVersionedHealthRoute,
  HEALTH_FLAG_NAME
};
