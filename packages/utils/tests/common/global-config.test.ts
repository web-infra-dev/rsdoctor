import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';

import { GlobalConfig } from '../../src/common';

describe('test src/common/global-config.ts', () => {
  let tempHome = '';
  let homedirSpy: ReturnType<typeof rs.spyOn>;

  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rsdoctor-mcp-'));
    homedirSpy = rs.spyOn(os, 'homedir').mockReturnValue(tempHome);
    fs.rmSync(GlobalConfig.getMcpConfigPath(), { force: true });
  });

  afterEach(() => {
    homedirSpy.mockRestore();
    fs.rmSync(tempHome, { recursive: true, force: true });
  });

  it('writes socket urls with ports for MCP clients', () => {
    GlobalConfig.writeMcpPort(3001, 'web', 'token-a');
    GlobalConfig.writeMcpPort(3002, 'server', 'token-b');

    expect(GlobalConfig.readMcpConfig()).toStrictEqual({
      portList: {
        web: 3001,
        server: 3002,
      },
      socketUrlList: {
        web: 'ws://localhost:3001?token=token-a',
        server: 'ws://localhost:3002?token=token-b',
      },
      port: 3002,
      socketUrl: 'ws://localhost:3002?token=token-b',
    });

    expect(GlobalConfig.getMcpServerInfo('web')).toStrictEqual({
      port: 3001,
      socketUrl: 'ws://localhost:3001?token=token-a',
    });
    expect(GlobalConfig.getMcpServerInfo()).toStrictEqual({
      port: 3002,
      socketUrl: 'ws://localhost:3002?token=token-b',
    });
    expect(GlobalConfig.getMcpServerInfo('missing')).toStrictEqual({
      port: 3002,
      socketUrl: 'ws://localhost:3002?token=token-b',
    });
    expect(GlobalConfig.getMcpServerInfoByPort(3001)).toStrictEqual({
      port: 3001,
      socketUrl: 'ws://localhost:3001?token=token-a',
    });
    expect(GlobalConfig.getMcpServerInfoByPort(3002)).toStrictEqual({
      port: 3002,
      socketUrl: 'ws://localhost:3002?token=token-b',
    });
    expect(GlobalConfig.getMcpServerInfoByPort(3003)).toStrictEqual({
      port: 3003,
    });
  });

  it('reads legacy MCP port configs without socket urls', () => {
    const mcpConfigPath = GlobalConfig.getMcpConfigPath();
    fs.mkdirSync(path.dirname(mcpConfigPath), { recursive: true });
    fs.writeFileSync(
      mcpConfigPath,
      JSON.stringify({
        portList: {
          web: 3001,
        },
        port: 3001,
      }),
      'utf8',
    );

    expect(GlobalConfig.getMcpServerInfo('web')).toStrictEqual({
      port: 3001,
      socketUrl: undefined,
    });
    expect(GlobalConfig.getMcpServerInfo()).toStrictEqual({
      port: 3001,
      socketUrl: undefined,
    });
  });
});
