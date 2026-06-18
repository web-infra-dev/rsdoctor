import { describe, it, expect } from '@rstest/core';
import type { AddressInfo } from 'net';
import { Server } from '../src/build';
import {
  createGetPortSyncFunctionString,
  defaultHost,
  getPortSync,
} from '../src/build/server';

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

  it('binds to localhost by default', async () => {
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
