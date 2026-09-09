import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, rs } from 'rstack/test';
import { Manifest, SDK } from '@rsdoctor/shared/types';
import { RsdoctorSDKController } from '@/sdk/multiple/controller';
import { RsdoctorSDK } from '@/sdk';

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

  function readReport(filePath: string): Manifest.RsdoctorBriefData {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
        const report = readReport(sdk.getBriefJsonPath()!);
        expect(report.name).toBe(sdk.name);
        expect(report.data.summary.costs[0].name).toBe(sdk.name);
        expect(report.clientRoutes).toEqual(sdk.getClientRoutes());
        expect(report.series?.map((item) => item.name)).toEqual([
          'client',
          'server',
        ]);
        for (const item of report.series!) {
          const target = path.resolve(
            path.dirname(sdk.getBriefJsonPath()!),
            item.dataFile,
          );
          expect(readReport(target).name).toBe(item.name);
        }
      }
      expect(readReport(client.getBriefJsonPath()!).series?.[1].dataFile).toBe(
        'compilers/server/rsdoctor-data.json',
      );
      expect(readReport(server.getBriefJsonPath()!).series?.[0].dataFile).toBe(
        '../../rsdoctor-data.json',
      );
    },
  );

  it('refreshes earlier reports for late child compilers without restoring old build data', async () => {
    const client = createCompiler('client');
    await client.writeStore();
    expect(readReport(client.getBriefJsonPath()!).series).toHaveLength(1);

    const child = createCompiler('child.worker', { isChild: true });
    await child.writeStore();
    const clientReport = readReport(client.getBriefJsonPath()!);
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
    expect(
      readReport(client.getBriefJsonPath()!).data.summary.costs,
    ).toContainEqual({ name: 'rebuilt', startAt: 0, costs: 42 });
    expect(readReport(child.getBriefJsonPath()!).series).toHaveLength(3);

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

    const movedDir = path.join(outputDir, 'moved');
    fs.mkdirSync(movedDir);
    fs.renameSync(path.join(outputDir, 'data'), path.join(movedDir, 'data'));
    fs.renameSync(
      path.join(outputDir, 'compilers'),
      path.join(movedDir, 'compilers'),
    );
    const movedFile = path.join(movedDir, 'data/client data.json');
    const report = readReport(movedFile);
    expect(report.series).toHaveLength(2);
    for (const item of report.series!) {
      const target = path.resolve(path.dirname(movedFile), item.dataFile);
      const targetReport = readReport(target);
      expect(targetReport.name).toBe(item.name);
      for (const sibling of targetReport.series!) {
        expect(
          readReport(path.resolve(path.dirname(target), sibling.dataFile)).name,
        ).toBe(sibling.name);
      }
    }
  });

  it('isolates duplicate, sanitized and case-insensitive directory names', async () => {
    const compilers = [
      'client',
      'web/client',
      'web:client',
      'web-client-2',
      'WEB-CLIENT',
      'web/client',
    ].map((name) => createCompiler(name));
    await Promise.all(compilers.map((sdk) => sdk.writeStore()));
    const paths = compilers.map((sdk) => sdk.getBriefJsonPath()!.toLowerCase());
    expect(new Set(paths).size).toBe(compilers.length);
    for (const sdk of compilers) {
      expect(readReport(sdk.getBriefJsonPath()!).name).toBe(sdk.name);
    }
  });

  it('rejects custom filenames that resolve to the same output file', async () => {
    const client = createCompiler('client');
    await client.writeStore();
    const original = fs.readFileSync(client.getBriefJsonPath()!, 'utf8');
    const server = createCompiler('server', {
      fileName: '../../rsdoctor-data.json',
    });
    await expect(server.writeStore()).rejects.toThrow(
      'Compiler JSON output paths overlap',
    );
    expect(fs.readFileSync(client.getBriefJsonPath()!, 'utf8')).toBe(original);
  });

  it('keeps the previous JSON intact and cleans temporary files when replacement fails', async () => {
    const client = createCompiler('client');
    await client.writeStore();
    const original = fs.readFileSync(client.getBriefJsonPath()!, 'utf8');
    rs.spyOn(fs, 'renameSync').mockImplementationOnce(() => {
      throw new Error('replacement failed');
    });
    await expect(client.writeStore()).rejects.toThrow('replacement failed');
    expect(fs.readFileSync(client.getBriefJsonPath()!, 'utf8')).toBe(original);
    expect(fs.readdirSync(outputDir)).toEqual(['rsdoctor-data.json']);
    await client.writeStore();
  });

  it('preserves the standalone SDK JSON shape', async () => {
    const sdk = new RsdoctorSDK({
      name: 'standalone',
      root: outputDir,
      config: { noServer: true, mode: 'brief', brief: { type: ['json'] } },
    });
    try {
      sdk.setOutputDir(outputDir);
      await sdk.writeStore();
      expect(Object.keys(readReport(sdk.getBriefJsonPath()!)).sort()).toEqual([
        'clientRoutes',
        'data',
      ]);
    } finally {
      await sdk.dispose();
    }
  });
});
