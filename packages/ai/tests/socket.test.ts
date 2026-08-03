import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import { GlobalConfig } from '@rsdoctor/utils/common';
import type { Socket } from 'socket.io-client';
import { emitSocketRequest, getWsUrl } from '../src/server/socket';

describe('server/socket', () => {
  const originalArgv = process.argv;
  let tempHome = '';
  let homedirSpy: ReturnType<typeof rs.spyOn>;

  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rsdoctor-mcp-'));
    homedirSpy = rs.spyOn(os, 'homedir').mockReturnValue(tempHome);
    process.argv = ['node', 'rsdoctor-mcp'];
  });

  afterEach(() => {
    process.argv = originalArgv;
    homedirSpy.mockRestore();
    fs.rmSync(tempHome, { recursive: true, force: true });
  });

  it('uses tokenized socket url for explicit port MCP clients', async () => {
    GlobalConfig.writeMcpPort(3001, 'web', 'token-a');
    GlobalConfig.writeMcpPort(3002, 'server', 'token-b');

    process.argv = ['node', 'rsdoctor-mcp', '--port', '3001'];

    await expect(getWsUrl()).resolves.toBe('ws://localhost:3001?token=token-a');
  });

  it('prefers an explicit socket url', async () => {
    GlobalConfig.writeMcpPort(3001, 'web', 'token-a');
    process.argv = [
      'node',
      'rsdoctor-mcp',
      '--socket-url',
      'ws://localhost:4001?token=explicit-token',
    ];

    await expect(getWsUrl()).resolves.toBe(
      'ws://localhost:4001?token=explicit-token',
    );
  });

  it('applies a timeout to socket acknowledgements', async () => {
    const emitWithAck = rs.fn().mockRejectedValue(new Error('timed out'));
    const timeout = rs.fn().mockReturnValue({ emitWithAck });
    const socket = { timeout } as unknown as Socket;

    await expect(
      emitSocketRequest(socket, '/api/test', { value: 1 }, 100),
    ).rejects.toThrow('timed out');
    expect(timeout).toHaveBeenCalledWith(100);
    expect(emitWithAck).toHaveBeenCalledWith('/api/test', { value: 1 });
  });
});
