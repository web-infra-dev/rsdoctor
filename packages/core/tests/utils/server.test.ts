import { describe, it, expect } from 'rstack/test';
import { spawnSync } from 'node:child_process';
import type { AddressInfo } from 'net';
import { Server } from '../../src/build-utils/build';
import {
  createGetPortSyncFunctionString,
  defaultHost,
  getPortSync,
} from '../../src/build-utils/build/server';

describe('test src/server.ts', () => {
  it('getPort()', async () => {
    expect(await Server.getPort(6273)).toEqual(6273);

    const { close } = await Server.createServer(8292);
    expect(await Server.getPort(8292)).not.toEqual(8292);
    await close();
  });

  it('getPortSync()', async () => {
    expect(getPortSync(3543)).toEqual(3543);

    const { close } = await Server.createServer(8262);
    expect(getPortSync(8262)).not.toEqual(8262);
    await close();
  });

  it('rejects invalid ports before generating executable code', () => {
    for (const port of ['0); process.exit(1); //', Number.NaN, -1, 65_536]) {
      expect(() => createGetPortSyncFunctionString(port as never)).toThrow(
        'Invalid port',
      );
    }
  });

  it.each([
    { code: 'EPERM', port: 3543, attempts: [3543] },
    { code: 'EADDRINUSE', port: 65_535, attempts: [65_535, 0] },
    { code: 'EADDRINUSE', port: 0, attempts: [0] },
  ])('propagates $code when probing port $port', ({ code, port, attempts }) => {
    const script = `
      require('node:net').Server.prototype.listen = function (port) {
        console.log(port);
        const error = Object.assign(new Error('listen failed'), { code: ${JSON.stringify(code)} });
        this.emit('error', error);
      };
      ${createGetPortSyncFunctionString(port)}
    `;
    const result = spawnSync(process.execPath, ['-e', script], {
      encoding: 'utf8',
      timeout: 5000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(code);
    expect(result.stdout.trim().split(/\s+/).map(Number)).toEqual(attempts);
  });

  it('binds to 127.0.0.1 by default', async () => {
    const { server, close } = await Server.createServer(0);

    try {
      const address = server.address() as AddressInfo;
      expect(address.address).toEqual(defaultHost);
      expect(createGetPortSyncFunctionString(3543)).toContain(
        `getPort(port, ${JSON.stringify(defaultHost)})`,
      );
    } finally {
      await close();
    }
  });

  it('runs mounted middleware', async () => {
    const { app, server, close } = await Server.createServer(0);
    const { port } = server.address() as AddressInfo;

    app.use('/health', (_req, res) => {
      res.end('ok');
    });

    try {
      const response = await fetch(`http://${defaultHost}:${port}/health`);
      expect(await response.text()).toEqual('ok');
    } finally {
      await close();
    }
  });

  it('rejects when the requested port is already in use', async () => {
    const { server, close } = await Server.createServer(0);
    const { port } = server.address() as AddressInfo;

    try {
      await expect(Server.createServer(port)).rejects.toMatchObject({
        code: 'EADDRINUSE',
      });
    } finally {
      await close();
    }
  });
});
