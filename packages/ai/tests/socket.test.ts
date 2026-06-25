import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { GlobalConfig } from '@rsdoctor/utils/common';
import { getMcpPort, getMcpSocketUrl } from '../src/server/socket';

describe('server/socket', () => {
  let mcpConfigDir: string | undefined;
  let getMcpConfigPathSpy: { mockRestore: () => void } | undefined;

  afterEach(() => {
    getMcpConfigPathSpy?.mockRestore();
    if (mcpConfigDir) {
      fs.rmSync(mcpConfigDir, { recursive: true, force: true });
    }
    mcpConfigDir = undefined;
    getMcpConfigPathSpy = undefined;
  });

  function writeMcpConfig(data: unknown) {
    mcpConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsdoctor-mcp-'));
    const mcpConfigPath = path.join(mcpConfigDir, 'mcp.json');
    fs.writeFileSync(mcpConfigPath, JSON.stringify(data), 'utf8');
    getMcpConfigPathSpy = rs
      .spyOn(GlobalConfig, 'getMcpConfigPath')
      .mockReturnValue(mcpConfigPath);
  }

  it('reads socket url from mcp config', () => {
    writeMcpConfig({
      portList: {
        web: 9988,
      },
      port: 9988,
      socketUrlList: {
        web: 'ws://localhost:9988?token=web-token',
      },
      socketUrl: 'ws://localhost:9988?token=default-token',
    });

    expect(getMcpSocketUrl('web')).toBe('ws://localhost:9988?token=web-token');
    expect(getMcpSocketUrl()).toBe('ws://localhost:9988?token=default-token');
  });

  it('keeps port fallback for old mcp config', () => {
    writeMcpConfig({
      portList: {
        web: 9988,
      },
      port: 3000,
    });

    expect(getMcpSocketUrl('web')).toBeUndefined();
    expect(getMcpPort('web')).toBe(9988);
    expect(getMcpPort()).toBe(3000);
  });
});
