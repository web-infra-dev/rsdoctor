import { afterEach, describe, expect, it, rs } from 'rstack/test';
import type { RsdoctorSDK } from '@rsdoctor/core';
import type { Manifest } from '@rsdoctor/shared/types';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { analyze } from '../../src/commands/analyze';

describe('analyze command', () => {
  let root = '';
  let sdk: RsdoctorSDK | undefined;

  const createReport = (missing: Record<string, string> = {}) => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'rsdoctor-analyze-'));
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

  const run = async (port?: number) => {
    sdk = await analyze({
      cwd: root,
      name: 'rsdoctor',
      bin: 'rsdoctor',
    }).action({ profile: 'web.json', open: false, port });
    return sdk;
  };

  const fetchManifest = async (origin: string) => {
    const res = await fetch(`${origin}/api/manifest.json`);
    return (await res.json()) as Manifest.RsdoctorManifestWithShardingFiles;
  };

  afterEach(async () => {
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
      undefined,
      'http://127.0.0.1:1',
    ]);
  });

  it('stops every server when one fails to start', async () => {
    createReport();
    const listen = rs.spyOn(net.Server.prototype, 'listen');

    await expect(run(65536)).rejects.toThrow();

    const servers = listen.mock.contexts as net.Server[];
    listen.mockRestore();

    expect(servers.length).toBeGreaterThan(0);
    expect(servers.filter((server) => server.listening)).toEqual([]);
  });
});
