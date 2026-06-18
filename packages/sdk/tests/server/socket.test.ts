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

  function requestSocketHandshake(
    target: MockSDKResponse,
    origin?: string,
    host?: string,
  ) {
    return new Promise<{
      statusCode: number;
      allowOrigin: string | string[] | undefined;
    }>((resolve, reject) => {
      const url = new URL(
        `${target.server.origin}/socket.io/?EIO=4&transport=polling`,
      );
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

  it('rejects socket handshakes from non-local origins', async () => {
    await expect(
      requestSocketHandshake(target, 'https://example.com'),
    ).resolves.toMatchObject({
      statusCode: 403,
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

  it('rejects socket handshakes from disallowed custom CORS origins', async () => {
    await expect(
      requestSocketHandshake(customCorsTarget, 'https://evil.example.com'),
    ).resolves.toMatchObject({
      statusCode: 403,
    });
  });
});
