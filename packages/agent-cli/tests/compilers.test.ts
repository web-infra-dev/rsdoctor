import { afterEach, beforeEach, describe, expect, it } from 'rstack/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCli } from '../src/cli';
import { getToolCatalog } from '../src/commands';
import {
  listCompilers,
  loadCompilerData,
  withDataFile,
} from '../src/commands/datasource';
import {
  createInProcessRsdoctorCliToolExecutor,
  createRsdoctorCliToolExecutor,
} from '../src/executor';

let directory: string;
let entry: string;
const series = [
  { name: 'client', dataFile: 'report.json' },
  {
    name: 'server',
    displayName: 'Server',
    dataFile: 'compilers/server/report.json',
  },
];
function writeReport(relativePath: string, value: unknown): string {
  const file = path.join(directory, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
  return file;
}
function report(name: string, size: number) {
  return {
    name,
    data: { chunkGraph: { chunks: [{ id: 1, name, size }], assets: [] } },
  };
}
async function cli(args: string[], options: Parameters<typeof runCli>[1] = {}) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code = await runCli(args, {
    ...options,
    write: (text) => stdout.push(text),
    writeError: (text) => stderr.push(text),
  });
  return { code, stdout: stdout.join(''), stderr: stderr.join('') };
}

function load(file = entry, compiler?: string) {
  return withDataFile(file, compiler, () => loadCompilerData(file));
}

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rsdoctor-compilers-'));
  entry = writeReport('report.json', { ...report('client', 10), series });
  writeReport('compilers/server/report.json', report('server', 20));
});
afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

describe('compiler discovery and selection', () => {
  it('lists paths without reading other reports, including missing files', async () => {
    fs.writeFileSync(path.join(directory, series[1].dataFile), 'not JSON');
    const result = await cli(['compilers', 'list', '--data-file', entry]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).data.compilers).toEqual([
      { ...series[0], dataFile: entry, available: true },
      {
        ...series[1],
        dataFile: path.join(directory, series[1].dataFile),
        available: true,
      },
    ]);
    fs.unlinkSync(path.join(directory, series[1].dataFile));
    expect(listCompilers(entry).data.compilers[1].available).toBe(false);
  });

  it('requires an exact compiler name and reports structured errors only on stderr', async () => {
    for (const [args, code] of [
      [[], 'COMPILER_REQUIRED'],
      [['--compiler', 'Server'], 'COMPILER_NOT_FOUND'],
    ] as const) {
      const result = await cli([
        'chunks',
        'list',
        '--data-file',
        entry,
        ...args,
      ]);
      expect(result.code).toBe(1);
      expect(result.stdout).toBe('');
      expect(JSON.parse(result.stderr)).toMatchObject({
        ok: false,
        error: { code, compilers: ['client', 'server'] },
      });
    }
  });

  it('selects relative files and keeps overlapping chunk ids isolated across executions', async () => {
    const executor = createInProcessRsdoctorCliToolExecutor();
    for (const compiler of ['server', 'client', 'server']) {
      const result = await executor.execute({
        toolName: 'chunks_list',
        dataFile: entry,
        compiler,
        input: {},
      });
      expect(result).toMatchObject({
        data: { items: [{ id: 1, name: compiler }] },
      });
    }
    await expect(
      executor.execute({ toolName: 'chunks_list', dataFile: entry, input: {} }),
    ).rejects.toMatchObject({ code: 'COMPILER_REQUIRED' });
  });

  it('keeps compiler context across interleaved asynchronous executions', async () => {
    const results = await Promise.all(
      ['client', 'server'].map((compiler) =>
        withDataFile(entry, compiler, async () => {
          await Promise.resolve();
          return loadCompilerData(entry).name;
        }),
      ),
    );
    expect(results).toEqual(['client', 'server']);
  });

  it('auto-selects a singleton and preserves legacy reports', async () => {
    const single = writeReport('single.json', {
      ...report('server', 20),
      series: [{ name: 'server', dataFile: 'single.json' }],
    });
    const legacy = writeReport('legacy.json', {
      data: report('legacy', 30).data,
    });
    for (const file of [single, legacy]) {
      expect((await cli(['chunks', 'list', '--data-file', file])).code).toBe(0);
    }
    expect(listCompilers(legacy).data.compilers).toEqual([
      { name: null, dataFile: legacy, available: true },
    ]);
    const result = await cli([
      'chunks',
      'list',
      '--data-file',
      legacy,
      '--compiler',
      'server',
    ]);
    expect(JSON.parse(result.stderr).error.code).toBe(
      'COMPILER_METADATA_MISSING',
    );
  });

  it('rejects malformed indexes, duplicate names, missing data and mismatched target names', () => {
    const invalidIndexes = [
      [],
      {},
      [null],
      [{ name: 'x' }],
      [series[0], series[0]],
    ];
    for (const [index, value] of invalidIndexes.entries()) {
      const file = writeReport(`invalid-${index}.json`, {
        series: value,
      });
      expect(() => listCompilers(file)).toThrow('Invalid compiler index');
    }
    fs.unlinkSync(path.join(directory, series[1].dataFile));
    expect(() => load(entry, 'server')).toThrow('Compiler data file not found');
    writeReport(series[1].dataFile, report('wrong', 20));
    expect(() => load(entry, 'server')).toThrow('Compiler name mismatch');
  });

  it('resolves child compiler paths relative to a nested index', () => {
    const file = writeReport('nested/index.json', {
      series: [
        {
          name: 'child',
          dataFile: '../.slaves/child-/report.json',
          isChild: true,
        },
      ],
    });
    writeReport('.slaves/child-/report.json', report('child', 5));
    expect(load(file).name).toBe('child');
  });

  it('applies selection independently to both assets diff inputs', async () => {
    const baseline = writeReport('baseline.json', {
      series: [{ name: 'server', dataFile: 'compilers/server/report.json' }],
    });
    const current = writeReport('current/index.json', {
      series: [{ name: 'server', dataFile: 'server.json' }],
    });
    writeReport('current/server.json', {
      name: 'server',
      data: {
        chunkGraph: { chunks: [], assets: [{ path: 'index.js', size: 40 }] },
      },
    });
    const args = [
      'assets',
      'diff',
      '--data-file',
      entry,
      '--baseline',
      baseline,
      '--current',
      current,
      '--compiler',
      'server',
    ];
    const result = await cli(args);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).data.diff).toBeDefined();
    const missing = writeReport('missing.json', { series: [series[0]] });
    args[args.indexOf(current)] = missing;
    expect(JSON.parse((await cli(args)).stderr).error.code).toBe(
      'COMPILER_NOT_FOUND',
    );
  });
});

describe('compiler selection through query and process executors', () => {
  it('runs query discovery and selection through the process command mapping', async () => {
    const executor = createRsdoctorCliToolExecutor({
      tools: getToolCatalog(),
      runCommand: async (command) => {
        const result = await cli(command.slice(1));
        if (result.code)
          throw Object.assign(new Error('process failed'), {
            stderr: result.stderr,
          });
        return result.stdout;
      },
    });
    for (const [tool, compiler, expectedCode] of [
      ['compilers_list', undefined, 0],
      ['chunks_list', 'server', 0],
      ['chunks_list', undefined, 1],
    ] as const) {
      const result = await cli(
        [
          'query',
          tool,
          '--data-file',
          entry,
          ...(compiler ? ['--compiler', compiler] : []),
        ],
        {
          executeTool: (request) => {
            expect(request).toEqual({
              toolName: tool,
              dataFile: entry,
              input: {},
              ...(compiler ? { compiler } : {}),
            });
            return executor.execute(request);
          },
        },
      );
      expect(result.code).toBe(expectedCode);
      if (expectedCode) {
        expect(result.stdout).toBe('');
        expect(JSON.parse(result.stderr).error).toMatchObject({
          code: 'COMPILER_REQUIRED',
          compilers: ['client', 'server'],
        });
      } else {
        expect(result.stderr).toBe('');
        expect(result.stdout).toContain('server');
      }
    }
  });
});
