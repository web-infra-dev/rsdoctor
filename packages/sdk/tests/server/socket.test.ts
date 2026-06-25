import { describe, it, expect, rs } from '@rstest/core';
import { request } from 'http';
import { setupSDK, type MockSDKResponse } from '../utils';

rs.setConfig({ testTimeout: 50000 });

describe('test server/socket.ts', () => {
  const target = setupSDK();

  function requestSocketHandshake(
    target: MockSDKResponse,
    host?: string,
    token = target.server.socketUrl.token,
  ) {
    return new Promise<{ statusCode: number }>((resolve, reject) => {
      const url = new URL(target.server.socketUrl.socketUrl);
      if (token) {
        url.searchParams.set('token', token);
      } else {
        url.searchParams.delete('token');
      }

      const req = request({
        hostname: '127.0.0.1',
        port: target.server.port,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: {
          Connection: 'Upgrade',
          Upgrade: 'websocket',
          'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
          'Sec-WebSocket-Version': '13',
          ...(host ? { Host: host } : {}),
        },
      });

      req.on('upgrade', (res, socket) => {
        socket.destroy();
        resolve({ statusCode: res.statusCode || 0 });
      });
      req.on('response', (res) => {
        res.resume();
        res.on('end', () => {
          resolve({ statusCode: res.statusCode || 0 });
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  it('rejects socket handshakes without tokens', async () => {
    await expect(
      requestSocketHandshake(target, undefined, ''),
    ).resolves.toStrictEqual({
      statusCode: 401,
    });
  });

  it('allows socket handshakes with valid tokens', async () => {
    await expect(requestSocketHandshake(target)).resolves.toStrictEqual({
      statusCode: 101,
    });
  });

  it('rejects socket handshakes with non-local Host headers', async () => {
    await expect(
      requestSocketHandshake(target, `evil.example.com:${target.server.port}`),
    ).resolves.toStrictEqual({
      statusCode: 401,
    });
  });

  it('rejects socket handshakes with invalid tokens', async () => {
    await expect(
      requestSocketHandshake(target, undefined, 'invalid-token'),
    ).resolves.toStrictEqual({
      statusCode: 401,
    });
  });
});
