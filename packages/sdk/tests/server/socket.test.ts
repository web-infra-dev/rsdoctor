import { describe, it, expect, rs } from '@rstest/core';
import { createServer, request, type Server } from 'http';
import { Socket } from '../../src/sdk/server/socket';
import { setupSDK } from '../utils';

rs.setConfig({ testTimeout: 50000 });

describe('test server/socket.ts', () => {
  const target = setupSDK();

  function requestSocketHandshake(
    origin?: string,
    host?: string,
    port = target.server.port,
  ) {
    return new Promise<{
      statusCode: number;
      allowOrigin: string | string[] | undefined;
    }>((resolve, reject) => {
      const url = new URL(
        `http://127.0.0.1:${port}/socket.io/?EIO=4&transport=polling`,
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

  function listen(server: Server) {
    return new Promise<number>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (!address || typeof address === 'string') {
          reject(new Error('Failed to listen on a local port'));
          return;
        }
        resolve(address.port);
      });
    });
  }

  it('rejects socket handshakes from non-local origins', async () => {
    await expect(
      requestSocketHandshake('https://example.com'),
    ).resolves.toMatchObject({
      statusCode: 403,
      allowOrigin: undefined,
    });
  });

  it('allows socket handshakes from local origins', async () => {
    const origin = `http://foo.localhost:${target.server.port}`;

    await expect(requestSocketHandshake(origin)).resolves.toMatchObject({
      statusCode: 200,
      allowOrigin: origin,
    });
  });

  it('rejects socket handshakes with non-local Host headers', async () => {
    const origin = `http://foo.localhost:${target.server.port}`;

    await expect(
      requestSocketHandshake(origin, `evil.example.com:${target.server.port}`),
    ).resolves.toMatchObject({
      statusCode: 403,
    });
    await expect(
      requestSocketHandshake(origin, `192.168.1.10:${target.server.port}`),
    ).resolves.toMatchObject({
      statusCode: 403,
    });
  });

  it('enforces custom socket origins during handshakes', async () => {
    const server = createServer();
    const port = await listen(server);
    const socket = new Socket({
      sdk: {} as any,
      server,
      port,
      socketOptions: {
        cors: {
          origin: 'https://allowed.example',
        },
      },
    });

    socket.bootstrap();

    try {
      await expect(
        requestSocketHandshake(
          'https://allowed.example',
          `127.0.0.1:${port}`,
          port,
        ),
      ).resolves.toMatchObject({
        statusCode: 200,
        allowOrigin: 'https://allowed.example',
      });
      await expect(
        requestSocketHandshake(
          'https://evil.example',
          `127.0.0.1:${port}`,
          port,
        ),
      ).resolves.toMatchObject({
        statusCode: 403,
      });
    } finally {
      socket.dispose();
      server.close();
    }
  });
});
