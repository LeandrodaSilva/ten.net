'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createApp } = require('../src/index');

function request(server, path, method = 'GET') {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: address.port,
        path,
        method
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

function withEnv(overrides, run) {
  const previous = {};
  for (const [key, value] of Object.entries(overrides)) {
    previous[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return Promise.resolve()
    .then(run)
    .finally(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });
}

test('contract: /v1/health healthy response shape is stable', async () => {
  await withEnv(
    {
      HEALTH_ENDPOINT_V1_ENABLED: 'true',
      health_endpoint_v1_enabled: 'true',
      DEPENDENCY_DATABASE_OK: 'true',
      DEPENDENCY_QUEUE_OK: 'true',
      APP_VERSION: '2.0.0',
      APP_COMMIT: 'def456',
      APP_DEPLOYED_AT: '2026-04-30T00:00:00.000Z'
    },
    async () => {
      const { server } = createApp();
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      try {
        const res = await request(server, '/v1/health');
        assert.equal(res.statusCode, 200);
        assert.equal(res.headers['content-type'], 'application/json');

        const body = JSON.parse(res.body);
        assert.deepEqual(body, {
          status: 'ok',
          version: '2.0.0',
          commit: 'def456',
          deployedAt: '2026-04-30T00:00:00.000Z',
          build: {
            version: '2.0.0',
            commit: 'def456',
            deployedAt: '2026-04-30T00:00:00.000Z'
          },
          dependencies: {
            database: 'ok',
            queue: 'ok'
          }
        });
      } finally {
        server.close();
      }
    }
  );
});

test('contract: /v1/health degraded maps to 503 and stable payload', async () => {
  await withEnv(
    {
      HEALTH_ENDPOINT_V1_ENABLED: 'true',
      health_endpoint_v1_enabled: 'true',
      DEPENDENCY_DATABASE_OK: 'false',
      DEPENDENCY_QUEUE_OK: 'true'
    },
    async () => {
      const { server } = createApp();
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      try {
        const res = await request(server, '/v1/health');
        assert.equal(res.statusCode, 503);

        const body = JSON.parse(res.body);
        assert.equal(body.status, 'degraded');
        assert.deepEqual(body.dependencies, { database: 'error', queue: 'ok' });
      } finally {
        server.close();
      }
    }
  );
});

test('contract: disabled endpoint returns stable not_found envelope', async () => {
  await withEnv({ HEALTH_ENDPOINT_V1_ENABLED: 'false', health_endpoint_v1_enabled: 'false' }, async () => {
    const { server } = createApp();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const res = await request(server, '/v1/health');
      assert.equal(res.statusCode, 404);
      const body = JSON.parse(res.body);
      assert.deepEqual(body, {
        error: {
          code: 'not_found',
          message: 'resource not found'
        }
      });
    } finally {
      server.close();
    }
  });
});

test('contract: unknown route returns stable not_found envelope', async () => {
  await withEnv({ HEALTH_ENDPOINT_V1_ENABLED: 'true', health_endpoint_v1_enabled: 'true' }, async () => {
    const { server } = createApp();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const res = await request(server, '/v1/does-not-exist');
      assert.equal(res.statusCode, 404);
      const body = JSON.parse(res.body);
      assert.deepEqual(body, {
        error: {
          code: 'not_found',
          message: 'resource not found'
        }
      });
    } finally {
      server.close();
    }
  });
});

test('contract: /metrics exposes expected metric families', async () => {
  await withEnv({ HEALTH_ENDPOINT_V1_ENABLED: 'true', health_endpoint_v1_enabled: 'true' }, async () => {
    const { server } = createApp();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

    try {
      await request(server, '/v1/health');
      const metricsRes = await request(server, '/metrics');
      assert.equal(metricsRes.statusCode, 200);
      assert.equal(
        metricsRes.headers['content-type'],
        'text/plain; version=0.0.4; charset=utf-8'
      );

      assert.match(metricsRes.body, /health_endpoint_requests_total/);
      assert.match(metricsRes.body, /health_endpoint_request_status_total/);
      assert.match(metricsRes.body, /health_endpoint_p50_latency_ms/);
      assert.match(metricsRes.body, /health_endpoint_p95_latency_ms/);
      assert.match(metricsRes.body, /health_dependency_failure_total/);
    } finally {
      server.close();
    }
  });
});

test('contract: /health bootstrap endpoint returns 200 and status ok', async () => {
  await withEnv({}, async () => {
    const { server } = createApp();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const res = await request(server, '/health');
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['content-type'], 'application/json');
      assert.deepEqual(JSON.parse(res.body), { status: 'ok' });
    } finally {
      server.close();
    }
  });
});
