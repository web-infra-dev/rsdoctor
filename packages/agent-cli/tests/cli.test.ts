import { describe, expect, it } from '@rstest/core';

import { runCli } from '../src/cli';
import { createRsdoctorToolCatalog } from '../src/tools/catalog';

describe('agent cli', () => {
  it('describes the available tools for an external main agent', async () => {
    const chunks: string[] = [];

    const exitCode = await runCli(['describe-tools'], {
      write: (text) => chunks.push(text),
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(chunks.join(''))).toEqual(
      createRsdoctorToolCatalog().map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    );
  });

  it('supports the migrated ai command schema introspection', async () => {
    const chunks: string[] = [];

    const exitCode = await runCli(['ai', '--describe'], {
      write: (text) => chunks.push(text),
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(chunks.join(''));
    expect(output.chunks.list.description).toContain('List all chunks');
    expect(output['tree-shaking'].summary.description).toContain(
      'tree-shaking health summary',
    );
  });

  it('shows the provider-agnostic binary name in usage text', async () => {
    const stderr: string[] = [];

    const exitCode = await runCli([], {
      writeError: (text) => stderr.push(text),
    });

    expect(exitCode).toBe(1);
    expect(stderr.join('')).toContain('rsdoctor-agent describe-tools');
  });

  it('invokes a named tool through rsdoctor ai for the external agent', async () => {
    const chunks: string[] = [];

    const exitCode = await runCli(
      [
        'run-tool',
        'packages_duplicates',
        '--data-file',
        '/tmp/demo.json',
        '--input',
        '{}',
      ],
      {
        executeTool: async () => ({
          ok: true,
          data: { duplicatedPackages: ['lodash', 'lodash-es'] },
        }),
        write: (text) => chunks.push(text),
      },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(chunks.join(''))).toEqual({
      ok: true,
      data: { duplicatedPackages: ['lodash', 'lodash-es'] },
    });
  });

  it('analyzes a natural-language query by running multiple tools', async () => {
    const chunks: string[] = [];

    const exitCode = await runCli(
      [
        'analyze',
        'Analyze this build and provide optimization suggestions.',
        '--data-file',
        '/tmp/demo.json',
        '--format',
        'json',
      ],
      {
        executeTool: async ({ toolName }) => ({
          ok: true,
          data: { inspected: toolName },
        }),
        write: (text) => chunks.push(text),
      },
    );

    expect(exitCode).toBe(0);
    const output = JSON.parse(chunks.join(''));
    expect(output.trace.length).toBeGreaterThan(1);
    expect(output.plan.length).toBeGreaterThan(1);
  });
});
