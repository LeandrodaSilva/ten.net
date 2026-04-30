'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.HEALTH_ENDPOINT_V1_ENABLED = 'true';
process.env.DEPENDENCY_DATABASE_OK = 'true';
process.env.DEPENDENCY_QUEUE_OK = 'true';
process.env.APP_VERSION = '1.2.3';
process.env.APP_COMMIT = 'abc123';
process.env.APP_DEPLOYED_AT = '2026-04-30T00:00:00.000Z';
process.env.health_endpoint_v1_enabled = 'true';

const { createApp, percentile } = require('../src/index');

function request(server, path) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: address.port,
        path,
        method: 'GET'
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: data, headers: res.headers });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

test('health endpoint returns v1 response and metrics reflect status', async () => {
  const { server } = createApp();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const health = await request(server, '/v1/health');
    assert.equal(health.statusCode, 200);
    const payload = JSON.parse(health.body);
    assert.equal(payload.status, 'ok');
    assert.equal(payload.version, '1.2.3');
    assert.equal(payload.commit, 'abc123');
    assert.equal(payload.deployedAt, '2026-04-30T00:00:00.000Z');
    assert.deepEqual(payload.dependencies, { database: 'ok', queue: 'ok' });

    const metrics = await request(server, '/metrics');
    assert.equal(metrics.statusCode, 200);
    assert.match(metrics.body, /health_endpoint_requests_total 1/);
    assert.match(metrics.body, /health_endpoint_request_status_total\{status_code="200"\} 1/);
  } finally {
    server.close();
  }
});

test('degraded dependencies produce 503 and dependency failure metric', async () => {
  process.env.DEPENDENCY_QUEUE_OK = 'false';
  const { server } = createApp();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const health = await request(server, '/v1/health');
    assert.equal(health.statusCode, 503);
    const payload = JSON.parse(health.body);
    assert.equal(payload.status, 'degraded');
    assert.equal(payload.version, '1.2.3');
    assert.deepEqual(payload.dependencies, { database: 'ok', queue: 'error' });

    const metrics = await request(server, '/metrics');
    assert.match(metrics.body, /health_endpoint_request_status_total\{status_code="503"\} 1/);
    assert.match(metrics.body, /health_dependency_failure_total\{dependency="queue"\} 1/);
  } finally {
    process.env.DEPENDENCY_QUEUE_OK = 'true';
    server.close();
  }
});

test('disabled feature flag returns stable not_found envelope', async () => {
  process.env.health_endpoint_v1_enabled = 'false';
  const { server } = createApp();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const health = await request(server, '/v1/health');
    assert.equal(health.statusCode, 404);
    const payload = JSON.parse(health.body);
    assert.deepEqual(payload, {
      error: {
        code: 'feature_disabled',
        message: 'health endpoint disabled'
      }
    });
  } finally {
    process.env.health_endpoint_v1_enabled = 'true';
    server.close();
  }
});

test('percentile returns sensible boundaries', () => {
  assert.equal(percentile([], 95), 0);
  assert.equal(percentile([10], 95), 10);
  assert.equal(percentile([1, 2, 3, 4, 5], 50), 3);
  assert.equal(percentile([1, 2, 3, 4, 5], 95), 5);
});
