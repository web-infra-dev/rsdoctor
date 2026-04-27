import { describe, expect, it } from '@rstest/core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from '../src/cli';

describe('agent cli', () => {
  it('lists the available subcommands for an external main agent', async () => {
    const chunks: string[] = [];

    const exitCode = await runCli(['list'], {
      write: (text) => chunks.push(text),
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(chunks.join(''));
    expect(Array.isArray(output)).toBe(true);
    expect(output.length).toBeGreaterThan(5);
    expect(
      output.some(
        (item: { path: string; description: string; args: unknown }) =>
          item.path === 'chunks.list' &&
          item.description.includes('List all chunks') &&
          !!item.args,
      ),
    ).toBe(true);
  });

  it('shows list and query commands in top-level help', async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    const exitCode = await runCli(['--help'], {
      write: (text) => stdout.push(text),
      writeError: (text) => stderr.push(text),
    });

    expect(exitCode).toBe(0);
    expect(stderr.join('')).toBe('');
    const text = stdout.join('');
    expect(text).toContain('list');
    expect(text).toContain('query <toolName>');
    expect(text).toContain('List all available subcommands.');
    expect(text).toContain('Execute one mapped tool from the catalog.');
  });

  it('invokes a named tool through the external agent query path', async () => {
    const chunks: string[] = [];
    let capturedInput: Record<string, unknown> | undefined;

    const exitCode = await runCli(
      [
        'query',
        'packages_duplicates',
        '--data-file',
        '/tmp/demo.json',
        '--input',
        '{}',
        '--filter',
        'rule,totalRules',
        '--page',
        '1',
        '--page-size',
        '20',
      ],
      {
        executeTool: async ({ input }) => {
          capturedInput = input;
          return {
            ok: true,
            data: { duplicatedPackages: ['lodash', 'lodash-es'] },
          };
        },
        write: (text) => chunks.push(text),
      },
    );

    expect(exitCode).toBe(0);
    expect(capturedInput).toEqual({
      filter: 'rule,totalRules',
      page: 1,
      pageSize: 20,
    });
    expect(JSON.parse(chunks.join(''))).toEqual({
      ok: true,
      data: { duplicatedPackages: ['lodash', 'lodash-es'] },
    });
  });

  it('supports equals-style query options', async () => {
    const chunks: string[] = [];
    let capturedRequest:
      | {
          toolName: string;
          input: Record<string, unknown>;
          dataFile: string;
        }
      | undefined;

    const exitCode = await runCli(
      [
        'query',
        'packages_duplicates',
        '--data-file=/tmp/demo.json',
        '--input={"includeDev":true}',
        '--filter=rule,totalRules',
        '--page=2',
        '--page-size=10',
      ],
      {
        executeTool: async (request) => {
          capturedRequest = request;
          return { ok: true };
        },
        write: (text) => chunks.push(text),
      },
    );

    expect(exitCode).toBe(0);
    expect(capturedRequest).toEqual({
      toolName: 'packages_duplicates',
      dataFile: '/tmp/demo.json',
      input: {
        includeDev: true,
        filter: 'rule,totalRules',
        page: 2,
        pageSize: 10,
      },
    });
    expect(JSON.parse(chunks.join(''))).toEqual({ ok: true });
  });

  it('rejects query pagination options without values', async () => {
    const stderr: string[] = [];

    const exitCode = await runCli(
      [
        'query',
        'packages_duplicates',
        '--data-file',
        '/tmp/demo.json',
        '--page',
      ],
      {
        writeError: (text) => stderr.push(text),
      },
    );

    expect(exitCode).toBe(1);
    expect(stderr.join('')).toContain('--page must be a positive integer.');
  });

  it('supports direct group command schema introspection', async () => {
    const chunks: string[] = [];

    const exitCode = await runCli(['chunks', '--describe'], {
      write: (text) => chunks.push(text),
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(chunks.join(''));
    expect(output.chunks.list.description).toContain('List all chunks');
    expect(output['tree-shaking'].summary.description).toContain(
      'tree-shaking health summary',
    );
    expect(output['tree-shaking']['side-effects'].description).toContain(
      'bailoutReason',
    );
  });

  it('keeps extension filters when diffing initial assets', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-'));
    const baselineFile = path.join(tempDir, 'baseline.json');
    const currentFile = path.join(tempDir, 'current.json');
    const createData = (
      jsSize: number,
      cssSize: number,
      imageSize: number,
    ) => ({
      data: {
        chunkGraph: {
          chunks: [
            { id: 1, initial: true },
            { id: 2, initial: false },
          ],
          assets: [
            { path: 'main.js', size: jsSize, chunks: [1] },
            { path: 'style.css', size: cssSize, chunks: [1] },
            { path: 'logo.png', size: imageSize, chunks: [1] },
            { path: 'async.js', size: 50, chunks: [2] },
          ],
        },
      },
    });

    fs.writeFileSync(baselineFile, JSON.stringify(createData(100, 20, 30)));
    fs.writeFileSync(currentFile, JSON.stringify(createData(120, 25, 35)));

    const stdout: string[] = [];

    try {
      const exitCode = await runCli(
        [
          'assets',
          'diff',
          '--data-file',
          baselineFile,
          '--baseline',
          baselineFile,
          '--current',
          currentFile,
        ],
        {
          write: (text) => stdout.push(text),
        },
      );

      expect(exitCode).toBe(0);
      const output = JSON.parse(stdout.join(''));
      expect(output.data.diff.js.initial).toMatchObject({
        size: { baseline: 100, current: 120 },
        count: { baseline: 1, current: 1 },
      });
      expect(output.data.diff.css.initial).toMatchObject({
        size: { baseline: 20, current: 25 },
        count: { baseline: 1, current: 1 },
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('shows a short usage hint when no command is provided', async () => {
    const stderr: string[] = [];

    const exitCode = await runCli([], {
      writeError: (text) => stderr.push(text),
    });

    expect(exitCode).toBe(1);
    const text = stderr.join('');
    expect(text).toContain('Usage: rsdoctor-agent <command>');
    expect(text).toContain('Run rsdoctor-agent --help');
  });

  it('executes a direct group command without the ai prefix', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-'));
    const dataFile = path.join(tempDir, 'rsdoctor-data.json');
    fs.writeFileSync(
      dataFile,
      JSON.stringify({
        data: {
          chunkGraph: {
            chunks: [
              {
                id: 1,
                name: 'main',
                size: 1024,
                modules: [],
              },
            ],
            assets: [],
          },
        },
      }),
    );

    const chunks: string[] = [];

    const exitCode = await runCli(['chunks', 'list', '--data-file', dataFile], {
      write: (text) => chunks.push(text),
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(chunks.join(''))).toEqual({
      ok: true,
      data: {
        total: 1,
        pageNumber: 1,
        pageSize: 100,
        totalPages: 1,
        items: [
          {
            id: 1,
            name: 'main',
            size: 1024,
            modules: [],
            assets: [],
          },
        ],
      },
      description: 'List all chunks (id, name, size, modules).',
    });
  });

  it('supports equals-style options for direct group commands', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-'));
    const dataFile = path.join(tempDir, 'rsdoctor-data.json');
    fs.writeFileSync(
      dataFile,
      JSON.stringify({
        data: {
          chunkGraph: {
            chunks: [
              {
                id: 1,
                name: 'main',
                size: 1024,
                modules: [],
              },
              {
                id: 2,
                name: 'async',
                size: 512,
                modules: [],
              },
            ],
            assets: [],
          },
        },
      }),
    );

    const chunks: string[] = [];

    const exitCode = await runCli(
      [
        'chunks',
        'list',
        `--data-file=${dataFile}`,
        '--page-number=2',
        '--page-size=1',
      ],
      {
        write: (text) => chunks.push(text),
      },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(chunks.join('')).data).toEqual({
      total: 2,
      pageNumber: 2,
      pageSize: 1,
      totalPages: 2,
      items: [
        {
          id: 2,
          name: 'async',
          size: 512,
          modules: [],
          assets: [],
        },
      ],
    });
  });

  it('supports equals-style schema introspection', async () => {
    const chunks: string[] = [];

    const exitCode = await runCli(['--schema=chunks.list'], {
      write: (text) => chunks.push(text),
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(chunks.join('')).description).toContain(
      'List all chunks',
    );
  });

  it('answers which modules were not tree-shaken for a side-effects category', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-'));
    const dataFile = path.join(tempDir, 'rsdoctor-data.json');
    fs.writeFileSync(
      dataFile,
      JSON.stringify({
        data: {
          moduleGraph: {
            modules: [
              {
                id: 1,
                path: '/repo/src/legacy-cjs.ts',
                bailoutReason: 'CommonJS require() prevents static analysis',
                size: { parsedSize: 20 },
                chunks: [1],
              },
              {
                id: 2,
                path: '/repo/src/register.ts',
                bailoutReason: 'side effects',
                size: { parsedSize: 10 },
                chunks: [1],
              },
            ],
          },
        },
      }),
    );

    const chunks: string[] = [];

    const exitCode = await runCli(
      ['modules', 'side-effects', '--data-file', dataFile, '--category', 'cjs'],
      {
        write: (text) => chunks.push(text),
      },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(chunks.join(''))).toEqual({
      ok: true,
      data: {
        category: 'cjs',
        question: 'Which modules were not tree-shaken because of cjs?',
        answer:
          '1 module was not tree-shaken because of cjs. See data.modules for details.',
        total: 1,
        pageNumber: 1,
        pageSize: 100,
        totalPages: 1,
        modules: [
          {
            id: 1,
            path: '/repo/src/legacy-cjs.ts',
            bailoutReason: 'CommonJS require() prevents static analysis',
            size: { parsedSize: 20 },
            chunks: [1],
          },
        ],
      },
      description:
        'Direct answer for modules that were not tree-shaken because of cjs.',
    });

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('lists retained modules with emitted chunks and filtered row fields', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-'));
    const dataFile = path.join(tempDir, 'rsdoctor-data.json');
    fs.writeFileSync(
      dataFile,
      JSON.stringify({
        data: {
          chunkGraph: {
            chunks: [
              { id: 1, name: 'main', modules: [1, 2] },
              { id: 2, name: 'async', modules: [3] },
              { id: 3, name: 'not-emitted', modules: [4] },
            ],
            assets: [
              {
                name: 'main.js',
                size: 1000,
                gzipSize: 300,
                chunks: [1],
              },
              {
                path: 'async.js',
                size: 800,
                gzipSize: 200,
                chunks: [2],
              },
            ],
          },
          moduleGraph: {
            modules: [
              {
                id: 1,
                path: '/repo/node_modules/react/index.js',
                bailoutReason: 'CommonJS module.exports prevents analysis',
                size: { sourceSize: 100, parsedSize: 80, gzipSize: 40 },
                chunks: [1],
              },
              {
                id: 2,
                path: '/repo/src/index.ts',
                bailoutReason: 'barrel export * re-export chain',
                size: { sourceSize: 90, parsedSize: 70, gzipSize: 50 },
                chunks: [1],
              },
              {
                id: 3,
                path: '/repo/src/register.ts',
                bailoutReason: 'side effects',
                size: { sourceSize: 60, parsedSize: 30, gzipSize: 10 },
                chunks: [2],
              },
              {
                id: 4,
                path: '/repo/src/server-only.ts',
                bailoutReason: 'side effects',
                size: { sourceSize: 200, parsedSize: 150, gzipSize: 100 },
                chunks: [3],
              },
            ],
          },
          packageGraph: {
            packages: [
              {
                id: 1,
                name: 'react',
                version: '18.3.1',
                root: '/repo/node_modules/react',
              },
            ],
            dependencies: [],
          },
        },
      }),
    );

    const stdout: string[] = [];

    try {
      const exitCode = await runCli(
        [
          'tree-shaking',
          'retained-modules',
          '--data-file',
          dataFile,
          '--emitted-only',
          '--category',
          'cjs,barrel,side-effects',
          '--sort',
          'gzipSize',
          '--limit',
          '2',
          '--filter',
          'id,path,size,chunks,bailoutReason',
        ],
        {
          write: (text) => stdout.push(text),
        },
      );

      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout.join(''))).toEqual({
        ok: true,
        data: {
          total: 3,
          emittedOnly: true,
          categories: ['cjs', 'barrel', 'side-effects'],
          sort: 'gzipSize',
          limit: 2,
          items: [
            {
              id: 2,
              path: '/repo/src/index.ts',
              size: { sourceSize: 90, parsedSize: 70, gzipSize: 50 },
              chunks: [
                {
                  id: 1,
                  name: 'main',
                  assets: [{ name: 'main.js', size: 1000, gzipSize: 300 }],
                },
              ],
              bailoutReason: 'barrel export * re-export chain',
            },
            {
              id: 1,
              path: '/repo/node_modules/react/index.js',
              size: { sourceSize: 100, parsedSize: 80, gzipSize: 40 },
              chunks: [
                {
                  id: 1,
                  name: 'main',
                  assets: [{ name: 'main.js', size: 1000, gzipSize: 300 }],
                },
              ],
              bailoutReason: 'CommonJS module.exports prevents analysis',
            },
          ],
        },
        description:
          'List retained modules that were not tree-shaken, with normalized categories, package metadata, emitted chunks, and recommendations.',
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('handles structured bailout reasons in retained modules', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-'));
    const dataFile = path.join(tempDir, 'rsdoctor-data.json');
    fs.writeFileSync(
      dataFile,
      JSON.stringify({
        data: {
          chunkGraph: {
            chunks: [{ id: 1, name: 'main', modules: [1] }],
            assets: [{ name: 'main.js', size: 1000, chunks: [1] }],
          },
          moduleGraph: {
            modules: [
              {
                id: 1,
                path: '/repo/src/cjs.ts',
                bailoutReason: {
                  reason: 'CommonJS exports assignment prevents analysis',
                  code: 'E1008',
                },
                size: { sourceSize: 100, parsedSize: 80, gzipSize: 40 },
                chunks: [1],
              },
            ],
          },
        },
      }),
    );

    const stdout: string[] = [];

    try {
      const exitCode = await runCli(
        [
          'tree-shaking',
          'retained-modules',
          '--data-file',
          dataFile,
          '--emitted-only',
          '--category',
          'cjs',
          '--filter',
          'id,category,bailoutReason',
          '--compact',
        ],
        {
          write: (text) => stdout.push(text),
        },
      );

      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout.join(''))).toEqual({
        ok: true,
        data: {
          total: 1,
          emittedOnly: true,
          categories: ['cjs'],
          sort: 'parsedSize',
          limit: 100,
          items: [
            {
              id: 1,
              category: 'cjs',
              bailoutReason: {
                reason: 'CommonJS exports assignment prevents analysis',
                code: 'E1008',
              },
            },
          ],
        },
        description:
          'List retained modules that were not tree-shaken, with normalized categories, package metadata, emitted chunks, and recommendations.',
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('returns subcommand description on group command help', async () => {
    const chunks: string[] = [];
    const stderr: string[] = [];

    const exitCode = await runCli(['chunks', 'list', '--help'], {
      write: (text) => chunks.push(text),
      writeError: (text) => stderr.push(text),
    });

    expect(exitCode).toBe(0);
    expect(stderr.join('')).toBe('');
    const output = JSON.parse(chunks.join(''));
    expect(output.command).toBe('chunks.list');
    expect(output.description).toContain('List all chunks');
    expect(output.inputSchema.type).toBe('object');
  });

  it('does not support analyze entry anymore', async () => {
    const stderr: string[] = [];
    const exitCode = await runCli(
      ['analyze', 'Analyze this build', '--data-file', '/tmp/demo.json'],
      {
        writeError: (text) => stderr.push(text),
      },
    );

    expect(exitCode).toBe(1);
    expect(stderr.join('')).toContain('Unknown command group: analyze');
  });
});
