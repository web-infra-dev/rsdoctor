import { afterEach, describe, expect, it, rs } from 'rstack/test';
import { RsdoctorSDK } from '@rsdoctor/core';
import type { Manifest } from '@rsdoctor/shared/types';
import { once } from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { analyze } from '../../src/commands/analyze';

describe('analyze command', () => {
  let root = '';
  let sdk: RsdoctorSDK | undefined;

  const createReport = (missing: Record<string, string | undefined> = {}) => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'rsdoctor-analyze-'));
    rs.spyOn(os, 'homedir').mockReturnValue(root);
    const series = ['web', 'worker'].map((name, stage) => ({
      name,
      path: path.join(root, `${name}.json`),
      stage,
      origin: missing[name],
    }));

    for (const { name, path: file } of series) {
      if (name in missing) continue;
      fs.writeFileSync(
        file,
        JSON.stringify({
          client: { enableRoutes: [] },
          data: { hash: `${name}-hash` },
          name,
          series,
        }),
      );
    }
  };

  const run = async (port?: number, profile = 'web.json') => {
    sdk = await analyze({
      cwd: root,
      name: 'rsdoctor',
      bin: 'rsdoctor',
    }).action({ profile, open: false, port });
    return sdk;
  };

  const fetchManifest = async (origin: string) => {
    const res = await fetch(`${origin}/api/manifest.json`);
    return (await res.json()) as Manifest.RsdoctorManifestWithShardingFiles;
  };

  afterEach(async () => {
    rs.restoreAllMocks();
    await sdk?.dispose();
    sdk = undefined;
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('serves every compiler from its own origin', async () => {
    createReport();
    const { server } = await run();

    const web = await fetchManifest(server.origin);
    const [webOrigin, workerOrigin] = web.series!.map((item) => item.origin);
    const hash = await fetch(`${workerOrigin}/api/data/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'hash' }),
    });
    const worker = await fetchManifest(workerOrigin!);

    expect(webOrigin).toBe(server.origin);
    expect(await hash.text()).toBe('worker-hash');
    expect(worker.name).toBe('worker');
    expect(worker.series).toEqual(web.series);
  });

  it('skips a compiler whose manifest is missing and keeps its origin', async () => {
    createReport({ worker: 'http://127.0.0.1:1' });
    const { server } = await run();

    const { series } = await fetchManifest(server.origin);

    expect(series!.map((item) => item.origin)).toEqual([
      server.origin,
      'http://127.0.0.1:1',
    ]);
  });

  it('hides a skipped compiler that has no origin', async () => {
    createReport({ worker: undefined });
    const { server } = await run();

    const { series } = await fetchManifest(server.origin);

    expect(series!.map((item) => item.name)).toEqual(['web']);
  });

  it('starts the selected compiler first and keeps it as the MCP default', async () => {
    createReport();
    const bootstrap = rs.spyOn(RsdoctorSDK.prototype, 'bootstrap');

    await run();

    const [web, worker] = bootstrap.mock.contexts as RsdoctorSDK[];
    const mcp = JSON.parse(
      fs.readFileSync(path.join(root, '.cache/rsdoctor/mcp.json'), 'utf8'),
    );

    expect([web.name, worker.name]).toEqual(['web', 'worker']);
    expect(mcp).toEqual({
      port: web.server.port,
      portList: { web: web.server.port, worker: worker.server.port },
    });
  });

  it('loads siblings of a URL profile only from its origin', async () => {
    createReport();
    const file = path.join(root, 'web.json');
    const web = JSON.parse(fs.readFileSync(file, 'utf8'));
    web.series[1].path = 'worker.json';
    web.series.push({ name: 'local', path: path.join(root, 'worker.json') });
    fs.writeFileSync(file, JSON.stringify(web));

    const files = http.createServer((req, res) =>
      res.end(fs.readFileSync(path.join(root, req.url!))),
    );
    await once(files.listen(0, '127.0.0.1'), 'listening');
    const { port } = files.address() as net.AddressInfo;

    try {
      const { server } = await run(
        undefined,
        `http://127.0.0.1:${port}/web.json`,
      );
      const { series } = await fetchManifest(server.origin);

      expect(series!.map((item) => item.name)).toEqual(['web', 'worker']);
    } finally {
      files.closeAllConnections();
      files.close();
    }
  });

  it('removes its process listeners on dispose', async () => {
    createReport();
    const events = [
      'exit',
      'SIGINT',
      'SIGTERM',
      'unhandledRejection',
      'uncaughtException',
    ];
    const count = () => events.map((event) => process.listenerCount(event));
    const before = count();

    await run();
    await sdk!.dispose();
    sdk = undefined;

    expect(count()).toEqual(before);
  });

  it('stops every server when one fails to start', async () => {
    createReport();
    const listen = rs.spyOn(net.Server.prototype, 'listen');
    const bootstrap = RsdoctorSDK.prototype.bootstrap;
    rs.spyOn(RsdoctorSDK.prototype, 'bootstrap')
      .mockImplementationOnce(bootstrap)
      .mockRejectedValueOnce(new Error('compiler failed to start'));

    await expect(run()).rejects.toThrow('compiler failed to start');

    const servers = listen.mock.contexts as net.Server[];
    listen.mockRestore();

    expect(servers.length).toBeGreaterThan(0);
    expect(servers.filter((server) => server.listening)).toEqual([]);
  });
});
