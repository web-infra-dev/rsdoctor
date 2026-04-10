import { describe, expect, it } from '@rstest/core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { getToolCatalog } from '../src/commands';
import {
  createInProcessRsdoctorCliToolExecutor,
  createRsdoctorCliToolExecutor,
} from '../src/executor';

describe('rsdoctor cli tool executor', () => {
  it('runs the mapped command and returns parsed json', async () => {
    const commands: string[][] = [];
    const catalog = getToolCatalog();
    const executor = createRsdoctorCliToolExecutor({
      tools: catalog,
      runCommand: async (command) => {
        commands.push(command);
        return JSON.stringify({
          ok: true,
          data: { duplicatePackages: [] },
          description: 'bundle optimize',
        });
      },
    });

    const result = await executor.execute({
      toolName: 'bundle_optimize',
      input: {},
      dataFile: '/tmp/demo.json',
    });

    expect(commands).toEqual([
      [
        'rsdoctor-agent',
        'bundle',
        'optimize',
        '--data-file',
        '/tmp/demo.json',
        '--compact',
      ],
    ]);
    expect(result).toEqual({
      ok: true,
      data: { duplicatePackages: [] },
      description: 'bundle optimize',
    });
  });

  it('executes tools in process and reuses the parsed data file', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-'));
    const dataFile = path.join(tempDir, 'rsdoctor-data.json');
    fs.writeFileSync(
      dataFile,
      JSON.stringify({
        data: {
          summary: { costs: [{ costs: 120 }] },
          chunkGraph: {
            chunks: [{ id: 1, name: 'main', size: 10, modules: [] }],
            assets: [{ name: 'main.js', size: 10, chunks: [1] }],
          },
          moduleGraph: { modules: [], dependencies: [], exports: [] },
          packageGraph: { packages: [], dependencies: [] },
          errors: [],
          configs: [],
        },
      }),
    );

    const originalReadFileSync = fs.readFileSync;
    let readCount = 0;
    (fs as typeof fs & { readFileSync: typeof fs.readFileSync }).readFileSync =
      ((...args: Parameters<typeof fs.readFileSync>) => {
        readCount += 1;
        return originalReadFileSync(...args);
      }) as typeof fs.readFileSync;

    const executor = createInProcessRsdoctorCliToolExecutor();

    try {
      const summary = await executor.execute({
        toolName: 'build_summary',
        input: {},
        dataFile,
      });
      const chunks = await executor.execute({
        toolName: 'chunks_list',
        input: {},
        dataFile,
      });

      expect(readCount).toBe(1);
      expect(summary).toEqual({
        ok: true,
        data: {
          costs: [{ costs: 120 }],
          totalCost: 120,
        },
        description: 'Get build summary with costs (build time analysis).',
      });
      expect(chunks).toEqual({
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
              size: 10,
              modules: [],
              assets: [
                {
                  name: 'main.js',
                  size: 10,
                },
              ],
            },
          ],
        },
        description: 'List all chunks (id, name, size, modules).',
      });
    } finally {
      fs.readFileSync = originalReadFileSync;
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
