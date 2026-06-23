import { describe, it, expect, rs } from '@rstest/core';
import { request } from 'http';
import { setupSDK, type MockSDKResponse } from '../utils';

rs.setConfig({ testTimeout: 50000 });

describe('test server/socket.ts', () => {
  const target = setupSDK();
  const customCorsTarget = setupSDK({
    server: {
      cors: {
        origin: 'https://example.com',
      },
    },
  });
  const partialCorsTarget = setupSDK({
    server: {
      cors: {
        credentials: true,
      },
    },
  });

  function requestSocketHandshake(
    target: MockSDKResponse,
    origin?: string,
    host?: string,
    token = target.server.socketUrl.token,
  ) {
    return new Promise<{
      statusCode: number;
      allowOrigin: string | string[] | undefined;
    }>((resolve, reject) => {
      const url = new URL(
        `${target.server.origin}/socket.io/?EIO=4&transport=polling`,
      );
      if (token) {
        url.searchParams.set('token', token);
      }
      const headers =
        origin || host
          ? {
              ...(origin ? { Origin: origin } : {}),
              ...(host ? { Host: host } : {}),
            }
          : undefined;
      const req = request(
        {
          hostname: url.hostname,
          port: url.port,
          path: `${url.pathname}${url.search}`,
          method: 'GET',
          headers,
        },
        (res) => {
          res.on('data', () => {});
          res.on('close', () => {
            resolve({
              statusCode: res.statusCode || 0,
              allowOrigin: res.headers['access-control-allow-origin'],
            });
          });
        },
      );

      req.on('error', reject);
      req.end();
    });
  }

  it('rejects socket handshakes without tokens', async () => {
    const origin = `http://127.0.0.1:${target.server.port}`;

    await expect(
      requestSocketHandshake(target, origin, undefined, ''),
    ).resolves.toMatchObject({
      statusCode: 403,
    });
  });

  it('does not expose CORS headers for non-local socket origins', async () => {
    await expect(
      requestSocketHandshake(target, 'https://example.com'),
    ).resolves.toMatchObject({
      statusCode: 200,
      allowOrigin: undefined,
    });
  });

  it('allows socket handshakes from local origins', async () => {
    const origin = `http://foo.localhost:${target.server.port}`;

    await expect(requestSocketHandshake(target, origin)).resolves.toMatchObject(
      {
        statusCode: 200,
        allowOrigin: origin,
      },
    );
  });

  it('rejects socket handshakes with non-local Host headers', async () => {
    const origin = `http://foo.localhost:${target.server.port}`;

    await expect(
      requestSocketHandshake(
        target,
        origin,
        `evil.example.com:${target.server.port}`,
      ),
    ).resolves.toMatchObject({
      statusCode: 403,
    });
  });

  it('allows socket handshakes from custom CORS origins', async () => {
    await expect(
      requestSocketHandshake(customCorsTarget, 'https://example.com'),
    ).resolves.toMatchObject({
      statusCode: 200,
      allowOrigin: 'https://example.com',
    });
  });

  it('uses the configured custom socket CORS origin header', async () => {
    await expect(
      requestSocketHandshake(customCorsTarget, 'https://evil.example.com'),
    ).resolves.toMatchObject({
      statusCode: 200,
      allowOrigin: 'https://example.com',
    });
  });

  it('preserves default CORS origins for partial socket CORS options', async () => {
    await expect(
      requestSocketHandshake(partialCorsTarget, 'https://example.com'),
    ).resolves.toMatchObject({
      statusCode: 200,
      allowOrigin: undefined,
    });

    const origin = `http://127.0.0.1:${partialCorsTarget.server.port}`;

    await expect(
      requestSocketHandshake(partialCorsTarget, origin),
    ).resolves.toMatchObject({
      statusCode: 200,
      allowOrigin: origin,
    });
  });

  it('rejects socket handshakes with invalid tokens', async () => {
    await expect(
      requestSocketHandshake(
        customCorsTarget,
        'https://example.com',
        undefined,
        'invalid-token',
      ),
    ).resolves.toMatchObject({
      statusCode: 403,
    });
  });
});
