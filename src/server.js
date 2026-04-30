'use strict';

const DEFAULT_PORT = 3000;
const HEALTH_FLAG_NAME = 'health_endpoint_v1_enabled';
const HEALTH_FLAG_NAME_V1 = 'HEALTH_ENDPOINT_V1_ENABLED';

function envFlagEnabled(rawValue) {
  return rawValue === '1' || rawValue === 'true';
}

function isV1HealthEnabled(env = process.env) {
  if (Object.prototype.hasOwnProperty.call(env, HEALTH_FLAG_NAME)) {
    return envFlagEnabled(env[HEALTH_FLAG_NAME]);
  }

  return envFlagEnabled(env[HEALTH_FLAG_NAME_V1]);
}

function getDependencyStatus(env = process.env) {
  const database = env.DATABASE_HEALTH_STATUS || 'ok';
  const queue = env.QUEUE_HEALTH_STATUS || 'ok';

  return {
    database,
    queue
  };
}

function buildHealthPayload(env = process.env) {
  const dependencies = getDependencyStatus(env);
  const status = Object.values(dependencies).every((value) => value === 'ok')
    ? 'ok'
    : 'degraded';
  const version = env.APP_VERSION || '0.1.0';
  const commit = env.APP_COMMIT || env.APP_COMMIT_SHA || 'unknown';
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

function createRequestHandler(env = process.env) {
  return function requestHandler(req, res) {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (req.method === 'GET' && req.url === '/v1/health') {
      if (!isV1HealthEnabled(env)) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify(getStableNotFoundResponse()));
        return;
      }

      const payload = buildHealthPayload(env);

      const statusCode = payload.status === 'ok' ? 200 : 503;
      res.writeHead(statusCode, { 'content-type': 'application/json' });
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
  HEALTH_FLAG_NAME,
  HEALTH_FLAG_NAME_V1,
  isV1HealthEnabled,
  DEFAULT_PORT
};
