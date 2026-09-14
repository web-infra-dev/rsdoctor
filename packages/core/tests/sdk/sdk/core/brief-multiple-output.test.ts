import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, rs } from 'rstack/test';
import { type Manifest, SDK } from '@rsdoctor/shared/types';
import { RsdoctorSDKController } from '@/sdk/multiple/controller';
import type { RsdoctorSDK } from '@/sdk';

describe('multi-compiler brief JSON', () => {
  let outputDir: string;
  let controller: RsdoctorSDKController;

  beforeEach(() => {
    outputDir = fs.mkdtempSync(path.join(tmpdir(), 'rsdoctor-multiple-json-'));
    controller = new RsdoctorSDKController(outputDir);
  });

  afterEach(async () => {
    await Promise.all(controller.slaves.map((sdk) => sdk.dispose()));
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  function createCompiler(
    name: string,
    options: {
      fileName?: string;
      type?: Array<'json' | 'html'>;
      isChild?: boolean;
    } = {},
  ) {
    const sdk = controller.createSlave({
      name,
      compilerPath: name,
      parentCompilerPath: options.isChild ? 'client' : undefined,
      isChild: options.isChild,
      type: SDK.ToDataType.Normal,
      extraConfig: {
        noServer: true,
        mode: 'brief',
        brief: {
          type: options.type ?? ['json'],
          jsonOptions: { fileName: options.fileName ?? 'rsdoctor-data.json' },
        },
      },
    });
    controller.registerSlave(sdk);
    controller.setOutputDir(sdk, outputDir);
    sdk.setOutputDir(controller.getCompilerOutputDir(sdk));
    sdk.reportSummaryData({
      costs: [{ name, startAt: 0, costs: controller.slaves.length }],
    });
    return sdk;
  }

  function readReport(
    source: string | RsdoctorSDK,
  ): Manifest.RsdoctorBriefData {
    const filePath =
      typeof source === 'string' ? source : source.getBriefJsonPath()!;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  function expectSeries(filePath: string, names: string[]) {
    const { series } = readReport(filePath);
    expect(series?.map((item) => item.name)).toEqual(names);
    for (const { name, dataFile } of series!) {
      expect(
        readReport(path.resolve(path.dirname(filePath), dataFile)).name,
      ).toBe(name);
    }
  }

  it.each([false, true])(
    'preserves each compiler when server finishes first: %s',
    async (serverFirst) => {
      const client = createCompiler('client');
      const server = createCompiler('server');
      for (const sdk of serverFirst ? [server, client] : [client, server]) {
        await sdk.writeStore();
      }

      for (const sdk of [client, server]) {
        const report = readReport(sdk);
        expect(report).toMatchObject({
          name: sdk.name,
          data: { summary: { costs: [{ name: sdk.name }] } },
          clientRoutes: sdk.getClientRoutes(),
        });
        expectSeries(sdk.getBriefJsonPath()!, ['client', 'server']);
      }
      expect(readReport(client).series?.[1].dataFile).toBe(
        'compilers/server/rsdoctor-data.json',
      );
      expect(readReport(server).series?.[0].dataFile).toBe(
        '../../rsdoctor-data.json',
      );
    },
  );

  it('refreshes earlier reports for late child compilers without restoring old build data', async () => {
    const client = createCompiler('client');
    await client.writeStore();
    expect(readReport(client).series).toHaveLength(1);

    const child = createCompiler('child.worker', { isChild: true });
    await child.writeStore();
    const clientReport = readReport(client);
    expect(clientReport.series?.[1]).toMatchObject({
      name: 'child.worker',
      dataFile: '.slaves/child.worker/rsdoctor-data.json',
      parentCompilerPath: 'client',
      isChild: true,
    });
    client.reportSummaryData({
      costs: [{ name: 'rebuilt', startAt: 0, costs: 42 }],
    });
    await client.writeStore();
    const server = createCompiler('server');
    await server.writeStore();
    expect(readReport(client).data.summary.costs).toContainEqual({
      name: 'rebuilt',
      startAt: 0,
      costs: 42,
    });
    expect(readReport(child).series).toHaveLength(3);

    const read = rs.spyOn(fs, 'readFileSync');
    await client.writeStore();
    expect(read).not.toHaveBeenCalled();
  });

  it('uses custom JSON paths for mixed output and remains portable after moving the directory', async () => {
    const client = createCompiler('client', {
      fileName: 'data/client data.json',
      type: ['json', 'html'],
    });
    const server = createCompiler('server', { fileName: 'data/server.json' });
    createCompiler('html-only', { type: ['html'] });
    client.reportFileName = 'report.html';
    rs.spyOn(client, 'inlineScriptsAndStyles').mockReturnValue('report.html');
    await client.writeStore();
    await server.writeStore();

    const movedDir = `${outputDir}-moved`;
    fs.renameSync(outputDir, movedDir);
    outputDir = movedDir;
    for (const file of [
      'data/client data.json',
      'compilers/server/data/server.json',
    ]) {
      expectSeries(path.join(outputDir, file), ['client', 'server']);
    }
  });

  it.each([
    {
      names: [
        'web/client',
        'web:client',
        'web-client-2',
        'WEB-CLIENT',
        'web/client',
      ],
      isChild: false,
    },
    { names: ['child worker-0-', 'child-worker-0-'], isChild: true },
  ])(
    'isolates colliding directory names (child: $isChild)',
    async ({ names, isChild }) => {
      const client = createCompiler('client');
      const compilers = names.map((name) => createCompiler(name, { isChild }));
      await Promise.all([client, ...compilers].map((sdk) => sdk.writeStore()));

      const paths = compilers.map((sdk) =>
        sdk.getBriefJsonPath()!.toLowerCase(),
      );
      expect(new Set(paths).size).toBe(compilers.length);
      for (const sdk of compilers) {
        expect(readReport(sdk).name).toBe(sdk.name);
      }
      expectSeries(client.getBriefJsonPath()!, [
        'client',
        ...compilers.map((sdk) => sdk.name),
      ]);
      if (isChild) {
        expect(readReport(client).series?.[1].dataFile).toBe(
          '.slaves/child-worker-0-/rsdoctor-data.json',
        );
      }
    },
  );

  it('rejects custom filenames that resolve to the same output file', async () => {
    const client = createCompiler('client');
    await client.writeStore();
    const original = readReport(client);
    const server = createCompiler('server', {
      fileName: '../../rsdoctor-data.json',
    });
    await expect(server.writeStore()).rejects.toThrow(
      'Compiler JSON output paths overlap',
    );
    expect(readReport(client)).toEqual(original);
  });

  it('keeps the previous JSON intact and cleans temporary files when replacement fails', async () => {
    const client = createCompiler('client');
    await client.writeStore();
    const original = readReport(client);
    rs.spyOn(fs, 'renameSync').mockImplementationOnce(() => {
      throw new Error('replacement failed');
    });
    await expect(client.writeStore()).rejects.toThrow('replacement failed');
    expect(readReport(client)).toEqual(original);
    expect(fs.readdirSync(outputDir)).toEqual(['rsdoctor-data.json']);
    await client.writeStore();
  });
});
