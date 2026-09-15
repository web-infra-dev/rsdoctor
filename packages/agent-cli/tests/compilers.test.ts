import { afterEach, beforeEach, describe, expect, it } from 'rstack/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCli } from '../src/cli';
import { createInProcessRsdoctorCliToolExecutor } from '../src/executor';

let directory: string;
let entry: string;
const series = [
  { name: 'client', dataFile: 'report.json' },
  { name: 'server', dataFile: 'compilers/server.json' },
];

function writeReport(relativePath: string, value: unknown): string {
  const file = path.join(directory, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
  return file;
}

function report(name: string) {
  return { name, data: { chunkGraph: { chunks: [{ id: 1, name }] } } };
}

async function cli(args: string[], dataFile = entry) {
  let stdout = '';
  let stderr = '';
  const code = await runCli([...args, '--data-file', dataFile], {
    executeTool: createInProcessRsdoctorCliToolExecutor().execute,
    write: (text) => {
      stdout += text;
    },
    writeError: (text) => {
      stderr += text;
    },
  });
  return { code, stdout, stderr };
}

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rsdoctor-compilers-'));
  entry = writeReport('report.json', { ...report('client'), series });
  writeReport(series[1].dataFile, report('server'));
});
afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

describe('compiler selection', () => {
  it('lists compiler names and resolved data files', async () => {
    const result = await cli(['compilers', 'list']);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).data.compilers).toEqual(
      series.map((compiler) => ({
        ...compiler,
        dataFile: path.join(directory, compiler.dataFile),
        available: true,
      })),
    );
  });

  it('selects the requested compiler through direct commands and query', async () => {
    for (const command of [
      ['chunks', 'list'],
      ['query', 'chunks_list'],
    ]) {
      const result = await cli([...command, '--compiler', 'server']);
      expect(result.code).toBe(0);
      expect(result.stderr).toBe('');
      expect(JSON.parse(result.stdout).data.items).toEqual([
        expect.objectContaining({ id: 1, name: 'server' }),
      ]);
    }
  });

  it('requires a valid compiler name for multi-compiler reports', async () => {
    for (const [args, code] of [
      [[], 'COMPILER_REQUIRED'],
      [['--compiler', 'unknown'], 'COMPILER_NOT_FOUND'],
    ] as const) {
      const result = await cli(['chunks', 'list', ...args]);
      expect(result.code).toBe(1);
      expect(result.stdout).toBe('');
      expect(JSON.parse(result.stderr).error).toMatchObject({
        code,
        compilers: ['client', 'server'],
      });
    }
  });

  it('auto-selects a singleton and supports legacy reports', async () => {
    const single = writeReport('single.json', {
      ...report('server'),
      series: [{ name: 'server', dataFile: 'single.json' }],
    });
    const legacy = writeReport('legacy.json', { data: report('server').data });
    for (const file of [single, legacy]) {
      const result = await cli(['chunks', 'list'], file);
      expect(result.code).toBe(0);
      expect(JSON.parse(result.stdout).data.items).toEqual([
        expect.objectContaining({ name: 'server' }),
      ]);
    }
  });
});
