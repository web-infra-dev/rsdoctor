import { describe, expect, it, rs } from '@rstest/core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { getToolCatalog } from '../src/commands';
import * as datasource from '../src/commands/datasource';
import { detectDuplicatePackages } from '../src/commands/handlers/packages';
import {
  createInProcessRsdoctorCliToolExecutor,
  createRsdoctorCliToolExecutor,
} from '../src/executor';
import { runCli } from '../src/cli';

function writeModuleGraphArtifact(modules: Array<Record<string, unknown>>): {
  dataFile: string;
  tempDir: string;
} {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-'));
  const dataFile = path.join(tempDir, 'rsdoctor-data.json');
  fs.writeFileSync(
    dataFile,
    JSON.stringify({ data: { moduleGraph: { modules } } }),
  );
  return { dataFile, tempDir };
}

describe('rsdoctor cli tool executor', () => {
  it('parses legacy and v1 artifacts without changing report data', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-data-'));
    const legacyFile = path.join(tempDir, 'legacy.json');
    const v1File = path.join(tempDir, 'v1.json');
    const reportData = {
      summary: { costs: [] },
      moduleGraph: { modules: [], dependencies: [], exports: [] },
    };
    fs.writeFileSync(legacyFile, JSON.stringify({ data: reportData }));
    fs.writeFileSync(
      v1File,
      JSON.stringify({
        data: reportData,
        metadata: {
          schemaVersion: 1,
          producer: { name: '@rsdoctor/core', version: '2.0.0-beta.0' },
          futureField: { preserved: true },
        },
      }),
    );

    try {
      const legacy = datasource.loadJsonData(legacyFile);
      const v1 = datasource.loadJsonData(v1File);

      expect(legacy.data).toEqual(reportData);
      expect(legacy.metadata).toBeUndefined();
      expect(v1.data).toEqual(reportData);
      expect(v1.metadata).toEqual({
        schemaVersion: 1,
        producer: { name: '@rsdoctor/core', version: '2.0.0-beta.0' },
        futureField: { preserved: true },
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('keeps collected-but-empty package graph results successful', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-'));
    const dataFile = path.join(tempDir, 'rsdoctor-data.json');
    fs.writeFileSync(
      dataFile,
      JSON.stringify({
        metadata: {
          schemaVersion: 1,
          sections: {
            packageGraph: { status: 'collected' },
          },
        },
        data: {
          packageGraph: { packages: [], dependencies: [] },
        },
      }),
    );

    const executor = createInProcessRsdoctorCliToolExecutor();

    try {
      await expect(
        executor.execute({
          toolName: 'packages_direct_dependencies',
          input: {},
          dataFile,
        }),
      ).resolves.toMatchObject({
        ok: true,
        data: { total: 0, items: [] },
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('reports omitted module graph data as unavailable to tree-shaking tools', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-'));
    const dataFile = path.join(tempDir, 'rsdoctor-data.json');
    fs.writeFileSync(
      dataFile,
      JSON.stringify({
        metadata: {
          schemaVersion: 1,
          sections: {
            moduleGraph: { status: 'omitted', reason: 'not-selected' },
          },
        },
        data: {
          moduleGraph: { modules: [], dependencies: [], exports: [] },
        },
      }),
    );

    const executor = createInProcessRsdoctorCliToolExecutor();

    try {
      await expect(
        executor.execute({
          toolName: 'tree_shaking_retained_modules',
          input: {},
          dataFile,
        }),
      ).resolves.toEqual({
        ok: false,
        error: {
          code: 'RSDOCTOR_SECTION_UNAVAILABLE',
          message:
            'Rsdoctor artifact section "moduleGraph" is unavailable (not-selected).',
          section: 'moduleGraph',
          status: 'omitted',
          reason: 'not-selected',
        },
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('reports an uncollected package graph instead of zero packages', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-'));
    const dataFile = path.join(tempDir, 'rsdoctor-data.json');
    fs.writeFileSync(
      dataFile,
      JSON.stringify({
        metadata: {
          schemaVersion: 1,
          sections: {
            packageGraph: { status: 'omitted', reason: 'not-collected' },
          },
        },
        data: {
          packageGraph: { packages: [], dependencies: [] },
        },
      }),
    );

    const executor = createInProcessRsdoctorCliToolExecutor();

    try {
      await expect(
        executor.execute({
          toolName: 'packages_direct_dependencies',
          input: {},
          dataFile,
        }),
      ).resolves.toEqual({
        ok: false,
        error: {
          code: 'RSDOCTOR_SECTION_UNAVAILABLE',
          message:
            'Rsdoctor artifact section "packageGraph" is unavailable (not-collected).',
          section: 'packageGraph',
          status: 'omitted',
          reason: 'not-collected',
        },
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('guards every catalog tool when its required artifact section is omitted', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-'));
    const dataFile = path.join(tempDir, 'rsdoctor-data.json');
    const requiredSectionByTool = {
      build_summary: 'summary',
      bundle_optimize: 'errors',
      chunks_list: 'chunkGraph',
      errors_list: 'errors',
      packages_direct_dependencies: 'packageGraph',
      packages_duplicates: 'errors',
      packages_similar: 'packageGraph',
      tree_shaking_retained_modules: 'moduleGraph',
      tree_shaking_side_effects: 'moduleGraph',
      tree_shaking_summary: 'errors',
    } as const;
    const sections = Object.fromEntries(
      [...new Set(Object.values(requiredSectionByTool))].map((section) => [
        section,
        { status: 'omitted', reason: 'not-selected' },
      ]),
    );
    fs.writeFileSync(
      dataFile,
      JSON.stringify({
        metadata: { schemaVersion: 1, sections },
        data: {
          chunkGraph: { assets: [], chunks: [], entrypoints: [] },
          errors: [],
          moduleGraph: { modules: [], dependencies: [], exports: [] },
          packageGraph: { packages: [], dependencies: [] },
          summary: {},
        },
      }),
    );

    const executor = createInProcessRsdoctorCliToolExecutor();

    try {
      expect(Object.keys(requiredSectionByTool).sort()).toEqual(
        getToolCatalog()
          .map((tool) => tool.name)
          .sort(),
      );
      for (const [toolName, section] of Object.entries(requiredSectionByTool)) {
        await expect(
          executor.execute({ toolName, input: {}, dataFile }),
        ).resolves.toMatchObject({
          ok: false,
          error: { code: 'RSDOCTOR_SECTION_UNAVAILABLE', section },
        });
      }
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('guards only the sections used by the selected bundle optimization step', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-'));
    const dataFile = path.join(tempDir, 'rsdoctor-data.json');
    fs.writeFileSync(
      dataFile,
      JSON.stringify({
        metadata: {
          schemaVersion: 1,
          sections: {
            chunkGraph: { status: 'omitted', reason: 'not-selected' },
            errors: { status: 'collected' },
            packageGraph: { status: 'omitted', reason: 'not-collected' },
          },
        },
        data: {
          chunkGraph: { assets: [], chunks: [], entrypoints: [] },
          errors: [],
          packageGraph: { packages: [], dependencies: [] },
        },
      }),
    );

    const executor = createInProcessRsdoctorCliToolExecutor();

    try {
      await expect(
        executor.execute({
          toolName: 'bundle_optimize',
          input: { step: 1 },
          dataFile,
        }),
      ).resolves.toMatchObject({
        ok: false,
        error: {
          code: 'RSDOCTOR_SECTION_UNAVAILABLE',
          section: 'packageGraph',
        },
      });
      await expect(
        executor.execute({
          toolName: 'bundle_optimize',
          input: { step: 2 },
          dataFile,
        }),
      ).resolves.toMatchObject({ ok: true });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

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

  it('supports tool output filtering and paging controls', async () => {
    const catalog = [
      {
        name: 'array_tool',
        description: 'test tool',
        inputSchema: {
          type: 'object' as const,
          properties: {},
          additionalProperties: true,
        },
        buildCommand: () => ['array-tool'],
      },
    ];
    const executor = createRsdoctorCliToolExecutor({
      tools: catalog,
      runCommand: async () =>
        JSON.stringify({
          ok: true,
          data: [
            { id: 1, name: 'a', size: 10, extra: 'drop' },
            { id: 2, name: 'b', size: 20, extra: 'drop' },
          ],
        }),
    });

    const result = await executor.execute({
      toolName: 'array_tool',
      input: {
        filter: 'id,name',
        page: 2,
        pageSize: 1,
      },
      dataFile: '/tmp/demo.json',
    });

    expect(result).toEqual({
      ok: true,
      data: {
        total: 2,
        pageNumber: 2,
        pageSize: 1,
        totalPages: 2,
        items: [{ id: 2, name: 'b' }],
      },
    });
  });

  it('passes paging controls into source-paginated tool commands', async () => {
    const commands: string[][] = [];
    const catalog = getToolCatalog();
    const executor = createRsdoctorCliToolExecutor({
      tools: catalog,
      runCommand: async (command) => {
        commands.push(command);
        return JSON.stringify({
          ok: true,
          data: {
            total: 2,
            pageNumber: 2,
            pageSize: 1,
            totalPages: 2,
            items: [{ id: 2, name: 'async' }],
          },
        });
      },
    });

    const result = await executor.execute({
      toolName: 'chunks_list',
      input: {
        page: 2,
        pageSize: 1,
      },
      dataFile: '/tmp/demo.json',
    });

    expect(commands).toEqual([
      [
        'rsdoctor-agent',
        'chunks',
        'list',
        '--data-file',
        '/tmp/demo.json',
        '--compact',
        '--page-number',
        '2',
        '--page-size',
        '1',
      ],
    ]);
    expect(result).toEqual({
      ok: true,
      data: {
        total: 2,
        pageNumber: 2,
        pageSize: 1,
        totalPages: 2,
        items: [{ id: 2, name: 'async' }],
      },
    });
  });

  it('excludes modules whose bailout reason has no content', async () => {
    const { dataFile, tempDir } = writeModuleGraphArtifact([
      { id: 1, path: '/repo/src/a.ts', bailoutReason: [] },
      { id: 2, path: '/repo/src/b.ts', bailoutReason: {} },
      {
        id: 3,
        path: '/repo/src/c.ts',
        bailoutReason: ['Statement with side_effects in source code'],
      },
    ]);
    const executor = createInProcessRsdoctorCliToolExecutor();

    try {
      const result = (await executor.execute({
        toolName: 'tree_shaking_side_effects',
        input: {},
        dataFile,
      })) as { data: { all: Array<{ id: number }>; total: number } };

      expect(result.data.total).toBe(1);
      expect(result.data.all.map((module) => module.id)).toEqual([3]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('uses limit to bound every side-effects module collection', async () => {
    const { dataFile, tempDir } = writeModuleGraphArtifact([
      {
        id: 1,
        path: '/repo/node_modules/pkg/a.js',
        bailoutReason: ['side effects'],
      },
      {
        id: 2,
        path: '/repo/node_modules/pkg/b.js',
        bailoutReason: ['side effects'],
      },
      {
        id: 3,
        path: '/repo/node_modules/pkg/c.js',
        bailoutReason: ['side effects'],
      },
    ]);
    const executor = createInProcessRsdoctorCliToolExecutor();

    try {
      const result = (await executor.execute({
        toolName: 'tree_shaking_side_effects',
        input: { limit: 1 },
        dataFile,
      })) as {
        data: {
          all: Array<{ id: number }>;
          nodeModules: {
            topPackages: Array<{ modules: Array<{ id: number }> }>;
          };
          pageNumber: number;
          pageSize: number;
          total: number;
        };
      };

      expect(result.data).toMatchObject({
        total: 3,
        pageNumber: 1,
        pageSize: 1,
      });
      expect(result.data.all.map((module) => module.id)).toEqual([1]);
      expect(
        result.data.nodeModules.topPackages.flatMap((pkg) => pkg.modules),
      ).toEqual([expect.objectContaining({ id: 1 })]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('accepts pageNumber when selecting a later source page', async () => {
    const { dataFile, tempDir } = writeModuleGraphArtifact([
      { id: 1, path: '/repo/src/a.ts', bailoutReason: ['side effects'] },
      { id: 2, path: '/repo/src/b.ts', bailoutReason: ['side effects'] },
    ]);
    const executor = createInProcessRsdoctorCliToolExecutor();

    try {
      const result = (await executor.execute({
        toolName: 'tree_shaking_side_effects',
        input: { limit: 1, pageNumber: 2 },
        dataFile,
      })) as {
        data: {
          all: Array<{ id: number }>;
          pageNumber: number;
          pageSize: number;
        };
      };

      expect(result.data.pageNumber).toBe(2);
      expect(result.data.pageSize).toBe(1);
      expect(result.data.all.map((module) => module.id)).toEqual([2]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('bounds bundle optimization chunk details with limit', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-'));
    const dataFile = path.join(tempDir, 'rsdoctor-data.json');
    fs.writeFileSync(
      dataFile,
      JSON.stringify({
        data: {
          chunkGraph: {
            chunks: [
              { id: 1, name: 'one', modules: [] },
              { id: 2, name: 'two', modules: [] },
              { id: 3, name: 'three', modules: [] },
            ],
            assets: [
              { path: 'one.js', size: 500_000, chunks: [1] },
              { path: 'one.css', size: 500_000, chunks: [1] },
              { path: 'two.js', size: 1_000_000, chunks: [2] },
              { path: 'three.js', size: 3_000_000, chunks: [3] },
              { path: 'three.css', size: 1_000_000, chunks: [3] },
            ],
          },
          errors: [],
          packageGraph: { packages: [], dependencies: [] },
        },
      }),
    );
    const executor = createInProcessRsdoctorCliToolExecutor();

    try {
      const result = (await executor.execute({
        toolName: 'bundle_optimize',
        input: { limit: 1, step: 1 },
        dataFile,
      })) as {
        data: {
          largeChunks: {
            data: {
              oversized: Array<{ assets: unknown[]; id: number }>;
            };
          };
          mediaAssets: {
            data: {
              chunks: Array<{ assets: unknown[]; id: number }>;
            };
          };
        };
      };

      expect(
        result.data.mediaAssets.data.chunks.map((chunk) => chunk.id),
      ).toEqual([1]);
      expect(result.data.mediaAssets.data.chunks[0].assets).toHaveLength(1);
      expect(result.data.largeChunks.data.oversized).toEqual([
        expect.objectContaining({ id: 3 }),
      ]);
      expect(result.data.largeChunks.data.oversized[0].assets).toHaveLength(1);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('detects duplicate package rules by code instead of description text', async () => {
    const spy = rs.spyOn(datasource, 'getRules').mockReturnValue([
      {
        code: 'E1001',
        description: 'Duplicate package rule without literal token in text',
      },
    ] as never);

    const result = await detectDuplicatePackages();

    expect(result).toEqual({
      ok: true,
      data: {
        rule: {
          code: 'E1001',
          description: 'Duplicate package rule without literal token in text',
        },
        totalRules: 1,
        note: undefined,
      },
      description:
        'Detect duplicate packages using E1001 overlay rule if present.',
    });

    spy.mockRestore();
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
              assets: [
                {
                  name: 'main.js',
                  size: 10,
                },
              ],
            },
          ],
        },
        description: 'List all chunks (id, name, size).',
      });

      const filteredSummary = await executor.execute({
        toolName: 'build_summary',
        input: { filter: 'totalCost' },
        dataFile,
      });
      expect(filteredSummary).toEqual({
        ok: true,
        data: { totalCost: 120 },
        description: 'Get build summary with costs (build time analysis).',
      });
    } finally {
      fs.readFileSync = originalReadFileSync;
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('uses tree-shaking summary for bundle optimization instead of side-effects details', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-'));
    const dataFile = path.join(tempDir, 'rsdoctor-data.json');
    fs.writeFileSync(
      dataFile,
      JSON.stringify({
        data: {
          summary: { costs: [] },
          chunkGraph: {
            chunks: [{ id: 1, name: 'main', size: 10, modules: [] }],
            assets: [],
          },
          moduleGraph: {
            modules: [
              {
                id: 'm1',
                path: '/repo/src/a.ts',
                bailoutReason: 'side effects',
                size: { parsedSize: 20 },
                chunks: [1],
              },
            ],
            dependencies: [],
            exports: [],
          },
          packageGraph: { packages: [], dependencies: [] },
          errors: [
            {
              id: 'e1',
              code: 'E1007',
              title: 'side effects only import',
              description: 'E1007 found',
              level: 'warn',
              category: 'tree-shaking',
              type: 'rule',
            },
          ],
          configs: [],
        },
      }),
    );

    const executor = createInProcessRsdoctorCliToolExecutor();

    try {
      const result = await executor.execute({
        toolName: 'bundle_optimize',
        input: {},
        dataFile,
      });

      expect((result as { data: Record<string, unknown> }).data).toHaveProperty(
        'treeShakingSummary',
      );
      expect(
        (result as { data: Record<string, unknown> }).data,
      ).not.toHaveProperty('sideEffectsModules');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('lists direct third-party package dependencies from project packages', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-'));
    const dataFile = path.join(tempDir, 'rsdoctor-data.json');
    fs.writeFileSync(
      dataFile,
      JSON.stringify({
        data: {
          packageGraph: {
            packages: [
              {
                id: 1,
                name: 'app',
                version: '1.0.0',
                root: '/repo',
                size: { parsedSize: 1 },
              },
              {
                id: 2,
                name: 'lodash',
                version: '4.17.21',
                root: '/repo/node_modules/lodash',
                size: { parsedSize: 20 },
              },
              {
                id: 3,
                name: 'react',
                version: '18.3.1',
                root: '/repo/node_modules/react',
                size: { parsedSize: 30 },
              },
              {
                id: 4,
                name: 'workspace-ui',
                version: '1.0.0',
                root: '/repo/packages/ui',
                size: { parsedSize: 5 },
              },
            ],
            dependencies: [
              { id: 1, package: 1, dependency: 2, refDependency: 101 },
              { id: 2, package: 2, dependency: 3, refDependency: 102 },
              { id: 3, package: 4, dependency: 3, refDependency: 103 },
            ],
          },
        },
      }),
    );

    const executor = createInProcessRsdoctorCliToolExecutor();

    try {
      const result = await executor.execute({
        toolName: 'packages_direct_dependencies',
        input: {},
        dataFile,
      });

      expect(result).toEqual({
        ok: true,
        data: {
          total: 2,
          items: [
            {
              id: 2,
              name: 'lodash',
              version: '4.17.21',
              root: '/repo/node_modules/lodash',
              size: { parsedSize: 20 },
              duplicates: [],
              dependencyIds: [1],
              refDependencyIds: [101],
            },
            {
              id: 3,
              name: 'react',
              version: '18.3.1',
              root: '/repo/node_modules/react',
              size: { parsedSize: 30 },
              duplicates: [],
              dependencyIds: [3],
              refDependencyIds: [103],
            },
          ],
        },
        description:
          'List third-party packages directly imported by project/local packages.',
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('keeps tree shaking summary lightweight and exposes side effects via dedicated tool', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-'));
    const dataFile = path.join(tempDir, 'rsdoctor-data.json');
    fs.writeFileSync(
      dataFile,
      JSON.stringify({
        data: {
          moduleGraph: {
            modules: [
              {
                id: 'm1',
                path: '/repo/src/a.ts',
                bailoutReason: 'side effects',
                size: { parsedSize: 20 },
                chunks: [1],
              },
              {
                id: 'm2',
                path: '/repo/node_modules/lodash-es/index.js',
                bailoutReason: 'unknown exports',
                size: { parsedSize: 30 },
                chunks: [1],
              },
            ],
          },
          errors: [
            {
              id: 'e1',
              code: 'E1007',
              title: 'side effects only import',
              description: 'E1007 found',
              level: 'warn',
              category: 'tree-shaking',
              type: 'rule',
            },
            {
              id: 'e2',
              code: 'E1009',
              title: 'esm to cjs',
              description: 'E1009 found',
              level: 'warn',
              category: 'tree-shaking',
              type: 'rule',
            },
          ],
        },
      }),
    );

    const executor = createInProcessRsdoctorCliToolExecutor();

    try {
      const summary = await executor.execute({
        toolName: 'tree_shaking_summary',
        input: {},
        dataFile,
      });
      const sideEffects = await executor.execute({
        toolName: 'tree_shaking_side_effects',
        input: { page: 1, pageSize: 10 },
        dataFile,
      });

      expect(summary).toEqual({
        ok: true,
        data: {
          violations: {
            e1007SideEffectsOnlyImports: {
              id: 'e1',
              code: 'E1007',
              title: 'side effects only import',
              description: 'E1007 found',
              level: 'warn',
              category: 'tree-shaking',
              type: 'rule',
            },
            e1008CjsRequire: null,
            e1009EsmToCjs: {
              id: 'e2',
              code: 'E1009',
              title: 'esm to cjs',
              description: 'E1009 found',
              level: 'warn',
              category: 'tree-shaking',
              type: 'rule',
            },
          },
          totalViolations: 2,
          totalRules: 2,
        },
        description: expect.stringContaining('Comprehensive tree-shaking'),
      });
      expect(
        (summary as { data: Record<string, unknown> }).data,
      ).not.toHaveProperty('sideEffects');

      expect(sideEffects).toEqual({
        ok: true,
        data: {
          total: 2,
          pageNumber: 1,
          pageSize: 10,
          totalPages: 1,
          nodeModules: {
            count: 1,
            topPackages: [
              {
                name: 'lodash-es',
                count: 1,
                totalSize: 30,
                modules: [
                  {
                    id: 'm2',
                    path: '/repo/node_modules/lodash-es/index.js',
                    bailoutReason: 'unknown exports',
                    size: { parsedSize: 30 },
                    chunks: [1],
                  },
                ],
              },
            ],
          },
          userCode: {
            count: 1,
            totalPages: 1,
            modules: [
              {
                id: 'm1',
                path: '/repo/src/a.ts',
                bailoutReason: 'side effects',
                size: { parsedSize: 20 },
                chunks: [1],
              },
            ],
          },
          all: [
            {
              id: 'm1',
              path: '/repo/src/a.ts',
              bailoutReason: 'side effects',
              size: { parsedSize: 20 },
              chunks: [1],
            },
            {
              id: 'm2',
              path: '/repo/node_modules/lodash-es/index.js',
              bailoutReason: 'unknown exports',
              size: { parsedSize: 30 },
              chunks: [1],
            },
          ],
        },
        description: expect.stringContaining('bailoutReason'),
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('returns only paginated modules for tree-shaking bailout reasons', async () => {
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
                path: '/repo/src/a.ts',
                bailoutReason: 'side effects',
                size: { parsedSize: 20 },
                chunks: [1],
              },
              {
                id: 2,
                path: '/repo/src/b.ts',
                bailoutReason: 'unknown exports',
                size: { parsedSize: 30 },
                chunks: [1],
              },
              {
                id: 3,
                path: '/repo/src/c.ts',
                size: { parsedSize: 40 },
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
          'bailout-reasons',
          '--data-file',
          dataFile,
          '--page-number',
          '1',
          '--page-size',
          '1',
        ],
        {
          write: (text) => stdout.push(text),
        },
      );

      expect(exitCode).toBe(0);
      const output = JSON.parse(stdout.join(''));
      expect(output).toEqual({
        ok: true,
        data: {
          total: 2,
          pageNumber: 1,
          pageSize: 1,
          totalPages: 2,
          modules: [
            {
              id: 1,
              path: '/repo/src/a.ts',
              bailoutReason: 'side effects',
              size: { parsedSize: 20 },
              chunks: [1],
            },
          ],
        },
        description: expect.stringContaining('bailoutReason'),
      });
      expect(output.data).not.toHaveProperty('nodeModules');
      expect(output.data).not.toHaveProperty('userCode');
      expect(output.data).not.toHaveProperty('all');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('filters tree-shaking bailout reasons by requested modules', async () => {
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
                path: '/repo/src/a.ts',
                bailoutReason: 'side effects',
                size: { parsedSize: 20 },
                chunks: [1],
              },
              {
                id: 2,
                path: '/repo/src/b.ts',
                bailoutReason: 'unknown exports',
                size: { parsedSize: 30 },
                chunks: [1],
              },
              {
                id: 3,
                path: '/repo/src/c.ts',
                size: { parsedSize: 40 },
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
          'bailout-reasons',
          '--data-file',
          dataFile,
          '--modules',
          '2,3',
        ],
        {
          write: (text) => stdout.push(text),
        },
      );

      expect(exitCode).toBe(0);
      const output = JSON.parse(stdout.join(''));
      expect(output.data).toEqual({
        total: 1,
        pageNumber: 1,
        pageSize: 100,
        totalPages: 1,
        modules: [
          {
            id: 2,
            path: '/repo/src/b.ts',
            bailoutReason: 'unknown exports',
            size: { parsedSize: 30 },
            chunks: [1],
          },
        ],
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
