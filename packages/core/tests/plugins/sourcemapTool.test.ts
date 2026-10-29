import { describe, it, expect } from 'rstack/test';
import path from 'path';
import os from 'os';
import {
  bindContextCache,
  collectSourceMaps,
  handleAfterEmitAssets,
} from '../../src/inner-plugins/plugins/sourcemapTool';

// Add mock source map before createMockPluginInstance
const mockJsMap = {
  version: 3,
  sources: ['src/index.js'],
  names: [],
  mappings: 'AAAA;AACA',
  file: 'main.js',
  sourcesContent: ['console.log("test");\n'],
};

// mock RsdoctorPluginInstance and Compilation
function createMockPluginInstance() {
  return {
    sdk: { root: process.cwd() },
    _realSourcePathCache: new Map(),
    sourceMapSets: new Map(),
    options: {},
  } as any;
}
function createMockCompilation() {
  return {
    compiler: { rspack: {} },
    options: {
      output: {},
    },
    getAssets: () => [
      {
        name: 'main.js',
        source: {
          source: () => 'console.log("test");\n',
          name: 'main.js',
          sourceAndMap: () => ({
            source: 'console.log("test");\n',
            map: mockJsMap,
          }),
        },
        info: {},
      },
      {
        name: 'main.js.map',
        source: {
          source: () => JSON.stringify(mockJsMap),
          name: 'main.js.map',
        },
        info: {},
      },
    ],
  } as any;
}

describe('sourcemapTool', () => {
  describe('bindContextCache', () => {
    it('normalizes mixed separators in Windows drive paths and caches the result', () => {
      const context = path.resolve('/project');
      const source = String.raw`C:\project\src/nested/file.ts`;
      const expected =
        process.platform === 'win32'
          ? String.raw`C:\project\src\nested\file.ts`
          : path.resolve(context, source);
      const cache = new Map<string, string>();
      const resolveSource = bindContextCache(context, cache);

      expect(resolveSource(source)).toBe(expected);
      expect(cache.get(source)).toBe(expected);
      expect(resolveSource(source)).toBe(expected);
    });

    it('normalizes mixed separators in ordinary Windows UNC paths', () => {
      const context = path.resolve('/project');
      const source = String.raw`\\server\share/src/file.ts`;
      const expected =
        process.platform === 'win32'
          ? String.raw`\\server\share\src\file.ts`
          : path.resolve(context, source);

      expect(bindContextCache(context)(source)).toBe(expected);
    });

    it('preserves POSIX absolute paths including literal backslashes', () => {
      const resolveSource = bindContextCache(path.resolve('/project'));

      expect(resolveSource('/absolute/path/file.ts')).toBe(
        '/absolute/path/file.ts',
      );
      expect(resolveSource(String.raw`/absolute/literal\name.ts`)).toBe(
        String.raw`/absolute/literal\name.ts`,
      );
    });

    it('preserves device namespaces instead of normalizing their separators', () => {
      const context = path.resolve('/project');
      const resolveSource = bindContextCache(context);
      for (const source of [
        String.raw`\\?\C:\project/src/file.ts`,
        String.raw`\\.\pipe/project/channel`,
        '//?/C:/project/src/file.ts',
        '//./pipe/project/channel',
      ]) {
        const expected =
          process.platform === 'win32' || source.startsWith('/')
            ? source
            : path.resolve(context, source);
        expect(resolveSource(source)).toBe(expected);
      }
    });

    it('should resolve normal and webpack:// sources', () => {
      const context = '/project';
      const cache = new Map();
      const regex = /webpack:\/\/(?:foo)?([^?]*)/;
      const fn = bindContextCache(context, cache);
      // TODO: compatible with webpack paths
      if (os.EOL === '\n') {
        // Normal path
        expect(fn('src/index.js', regex)).toMatch(/\/project\/src\/index\.js$/);
        // webpack:// path
        expect(fn('webpack://foo/src/index.js', regex)).toMatch(
          /src\/index\.js$/,
        );
        // Not matched
        expect(fn('webpack://bar/other.js', regex)).toBe(
          '/project/bar/other.js',
        );
      }
    });

    it('should resolve webpack:// sources against context even with a namespace', () => {
      // Regression test: `webpack://` sources are emitted relative to the
      // compiler context, so they must not be resolved against process.cwd()
      // when the two differ (e.g. the build runs from a subdirectory).
      const context = path.resolve('/project/e2e');
      const regex = /(?:webpack:\/\/)?(?:my-app\/)?([^?]*)/;
      const fn = bindContextCache(context, new Map());
      expect(fn('webpack://my-app/./cases/a.js', regex)).toBe(
        path.resolve(context, 'cases/a.js'),
      );
    });

    it('should resolve relative paths based on sourceMapDir or sourceRoot', () => {
      const context = '/project/dist';

      // Case 1: No sourceRoot, use sourceMapDir
      const fn1 = bindContextCache(context, new Map(), '/project/dist/js');
      expect(fn1('../src/utils.js')).toBe(
        path.resolve('/project/dist/js', '../src/utils.js'),
      );

      // Case 2: sourceRoot is absolute
      const fn2 = bindContextCache(
        context,
        new Map(),
        '/project/dist/js',
        '/project/src',
      );
      expect(fn2('utils.js')).toBe(path.resolve('/project/src', 'utils.js'));

      // Case 3: sourceRoot is relative, use sourceMapDir as base
      const fn3 = bindContextCache(
        context,
        new Map(),
        '/project/dist/js',
        '../src',
      );
      // resolve('/project/dist/js', '../src', 'utils.js') -> /project/dist/src/utils.js
      expect(fn3('utils.js')).toBe(
        path.resolve('/project/dist/js', '../src', 'utils.js'),
      );

      // Case 4: sourceRoot is relative, no sourceMapDir, use context as base
      const fn4 = bindContextCache(context, new Map(), undefined, '../src');
      expect(fn4('utils.js')).toBe(path.resolve(context, '../src', 'utils.js'));
    });
  });

  describe('inline sourcemap path resolution', () => {
    it('should use hypothetical .map path to resolve relative sources', async () => {
      const plugin = createMockPluginInstance();
      const compilation = {
        compiler: { rspack: {} },
        options: {
          output: {
            path: '/project/dist',
          },
        },
        getAssets: () => [
          {
            name: 'js/bundle.js',
            source: {
              source: () => 'const foo=1;\n//# sourceMappingURL=bundle.js.map',
              name: 'js/bundle.js',
              sourceAndMap: () => ({
                source: 'const foo=1;\n',
                map: {
                  version: 3,
                  file: 'js/bundle.js',
                  sourceRoot: '../src',
                  sources: ['utils.js'],
                  names: [],
                  mappings: 'AAAA',
                  sourcesContent: ['export const foo = 1;\n'],
                },
              }),
            },
            info: {},
          },
        ],
      } as any;

      await handleAfterEmitAssets(compilation, plugin);
      expect(plugin.sourceMapSets.size).toBe(1);
      const resolvedKey = path.resolve(
        '/project/dist/js',
        '../src',
        'utils.js',
      );
      expect(plugin.sourceMapSets.has(resolvedKey)).toBe(true);
    });
  });

  describe('collectSourceMaps', () => {
    it('attributes mixed Windows drive paths to their canonical module keys', async () => {
      const plugin = createMockPluginInstance();
      const compilation = createMockCompilation();
      const context = path.resolve('/project');
      compilation.options.context = context;
      const sources = [
        String.raw`C:\project\src/first.ts`,
        String.raw`C:\project/src\second.ts`,
      ];
      const sourceMap = {
        version: 3,
        sources,
        names: [],
        mappings: 'AAAA;ACAA',
        file: 'main.js',
        sourcesContent: ['first();', 'second();'],
      };

      await collectSourceMaps(
        sourceMap,
        ['first();', 'second();'],
        compilation,
        plugin,
      );

      const expected =
        process.platform === 'win32'
          ? [
              String.raw`C:\project\src\first.ts`,
              String.raw`C:\project\src\second.ts`,
            ]
          : sources.map((source) => path.resolve(context, source));
      expect([...plugin.sourceMapSets.entries()]).toEqual([
        [expected[0], 'first();'],
        [expected[1], 'second();'],
      ]);
    });

    it('attributes mixed UNC paths to the canonical share path', async () => {
      const plugin = createMockPluginInstance();
      const compilation = createMockCompilation();
      const source = String.raw`\\server\share/src/file.ts`;
      const expected =
        process.platform === 'win32'
          ? String.raw`\\server\share\src\file.ts`
          : path.resolve(plugin.sdk.root, source);

      await collectSourceMaps(
        { ...mockJsMap, sources: [source], mappings: 'AAAA' },
        ['fromShare();'],
        compilation,
        plugin,
      );

      expect([...plugin.sourceMapSets.entries()]).toEqual([
        [expected, 'fromShare();'],
      ]);
    });

    it('normalizes physical paths after removing a loader chain and query', async () => {
      const plugin = createMockPluginInstance();
      const compilation = createMockCompilation();
      const source = String.raw`C:\project\src/file.ts`;
      const expected =
        process.platform === 'win32'
          ? String.raw`C:\project\src\file.ts`
          : path.resolve(plugin.sdk.root, source);

      await collectSourceMaps(
        {
          ...mockJsMap,
          sources: [`builtin:swc-loader!${source}??loader-options`],
          mappings: 'AAAA',
        },
        ['loaded();'],
        compilation,
        plugin,
      );

      expect([...plugin.sourceMapSets.entries()]).toEqual([
        [expected, 'loaded();'],
      ]);
    });

    it('checks canonical skipSources before accumulating another asset', async () => {
      const plugin = createMockPluginInstance();
      const compilation = createMockCompilation();
      const canonical =
        process.platform === 'win32'
          ? String.raw`C:\project\src\file.ts`
          : '/project/src/file.ts';
      const alias =
        process.platform === 'win32'
          ? String.raw`C:\project\src/file.ts`
          : canonical;
      plugin.sourceMapSets.set(canonical, 'original();');

      await collectSourceMaps(
        { ...mockJsMap, sources: [alias], mappings: 'AAAA' },
        ['duplicate();'],
        compilation,
        plugin,
        undefined,
        new Set([canonical]),
      );

      expect([...plugin.sourceMapSets.entries()]).toEqual([
        [canonical, 'original();'],
      ]);
    });

    it('should collect code segments for webpack sources', async () => {
      const plugin = createMockPluginInstance();
      const compilation = createMockCompilation();
      const regex =
        /webpack:\/\/(?:@examples\/rsdoctor-rspack-banner\/)?([^?]*)/;
      const sourceMap = {
        version: 3,
        sources: [
          'webpack://@examples/rsdoctor-rspack-banner/./node_modules/dayjs/dayjs.min.js',
        ],
        names: [],
        mappings: 'AAAA',
        file: 'main.js',
        sourcesContent: ['console.log("dayjs");'],
      };

      await collectSourceMaps(
        sourceMap,
        ['console.log("dayjs");'],
        compilation,
        plugin,
        regex,
      );

      // Assert that sourceMapSets is filled
      expect(plugin.sourceMapSets.size).toBeGreaterThan(0);
      // Assert that there is a key related to dayjs.min.js
      const hasDayjs = Array.from(plugin.sourceMapSets.keys()).some(
        (k: unknown) => typeof k === 'string' && k.includes('dayjs.min.js'),
      );
      expect(hasDayjs).toBe(true);
    });

    it('should resolve webpack:// sources against the compilation context', async () => {
      // Regression test: when the compiler context differs from the SDK root
      // (e.g. the build runs from a subdirectory), `webpack://./<path>`
      // sources must be resolved against the compiler context.
      const plugin = createMockPluginInstance();
      plugin.sdk.root = path.resolve('/project');
      const compilation = createMockCompilation();
      compilation.options.context = path.resolve('/project/e2e');
      const regex = /(?:webpack:\/\/)?(?:[^/]+\/)?([^?]*)/;
      const sourceMap = {
        version: 3,
        sources: ['webpack://./cases/a.js'],
        names: [],
        mappings: 'AAAA',
        file: 'main.js',
        sourcesContent: ['console.log("a");'],
      };

      await collectSourceMaps(
        sourceMap,
        ['console.log("a");'],
        compilation,
        plugin,
        regex,
      );

      expect(
        plugin.sourceMapSets.has(path.resolve('/project/e2e', 'cases/a.js')),
      ).toBe(true);
    });

    it('should extract absolute file path from loader chain', async () => {
      const plugin = createMockPluginInstance();
      const compilation = createMockCompilation();
      const sourceMap = {
        version: 3,
        sources: ['babel-loader!ts-loader!/absolute/path/to/file.ts'],
        names: [],
        mappings: 'AAAA',
        file: 'main.js',
        sourcesContent: ['const x = 1;'],
      };
      const codeLines = ['const x = 1;'];

      await collectSourceMaps(
        sourceMap,
        codeLines,
        compilation,
        plugin,
        undefined,
      );

      // Should extract the absolute path
      expect(plugin.sourceMapSets.has('/absolute/path/to/file.ts')).toBe(true);
    });

    it('should extract file path with query parameters (??)', async () => {
      const plugin = createMockPluginInstance();
      const compilation = createMockCompilation();
      const sourceMap = {
        version: 3,
        sources: [
          'babel-loader!ts-loader!/absolute/path/to/file.ts??query1?query2',
        ],
        names: [],
        mappings: 'AAAA',
        file: 'main.js',
        sourcesContent: ['const x = 1;'],
      };
      const codeLines = ['const x = 1;'];

      await collectSourceMaps(
        sourceMap,
        codeLines,
        compilation,
        plugin,
        undefined,
      );

      // Should extract path without query parameters
      expect(plugin.sourceMapSets.has('/absolute/path/to/file.ts')).toBe(true);
    });
  });

  describe('handleEmitAssets', () => {
    it('should process assets and fill sourceMapSets', async () => {
      const plugin = createMockPluginInstance();
      const compilation = createMockCompilation();
      await handleAfterEmitAssets(compilation, plugin);

      expect(plugin.sourceMapSets.size).toBe(1);
      const sourceMap = plugin.sourceMapSets.get(
        path.resolve(process.cwd(), 'src/index.js'),
      );
      expect(sourceMap).toBe('console.log("test");');
    });
  });

  describe('source map file lookup logic', () => {
    it('should find source map by exact name match', async () => {
      const plugin = createMockPluginInstance();
      const compilation = {
        compiler: { rspack: {} },
        options: {
          output: {
            filename: '[name].[contenthash].js',
          },
        },
        getAssets: () => [
          {
            name: 'main.abc123.js',
            source: {
              source: () => 'console.log("test");\n',
              name: 'main.abc123.js',
              sourceAndMap: () => ({
                source: 'console.log("test");\n',
                map: null, // No inline source map
              }),
            },
            info: {
              related: {
                sourceMap: 'main.abc123.js.map',
              },
            },
          },
          {
            name: 'main.abc123.js.map',
            source: {
              source: () => JSON.stringify(mockJsMap),
              name: 'main.abc123.js.map',
            },
            info: {},
          },
        ],
      } as any;

      await handleAfterEmitAssets(compilation, plugin);
      expect(plugin.sourceMapSets.size).toBe(1);
      const sourceMap = plugin.sourceMapSets.get(
        path.resolve(process.cwd(), 'src/index.js'),
      );
      expect(sourceMap).toBe('console.log("test");');
    });

    it('should fall back to AST parsing when a related source map has no source', async () => {
      const plugin = createMockPluginInstance();
      const compilation = {
        compiler: { rspack: {} },
        options: {
          output: {
            filename: '[name].[contenthash].js',
          },
        },
        getAssets: () => [
          {
            name: 'main.js',
            source: {
              source: () => 'console.log("test");\n',
              name: 'main.js',
              sourceAndMap: () => ({
                source: 'console.log("test");\n',
                map: mockJsMap,
              }),
            },
            info: {},
          },
          {
            name: 'worker.abc123.js',
            source: {
              source: () => 'console.log("worker");\n',
              name: 'worker.abc123.js',
              sourceAndMap: () => ({
                source: 'console.log("worker");\n',
                map: null,
              }),
            },
            info: {
              related: {
                sourceMap: 'worker.abc123.js.map',
              },
            },
          },
          {
            name: 'worker.abc123.js.map',
            info: {},
          },
        ],
      } as any;

      await handleAfterEmitAssets(compilation, plugin);
      expect(plugin.sourceMapSets.size).toBe(1);
      expect(plugin.assetsWithoutSourceMap).toEqual(
        new Set(['worker.abc123.js']),
      );
    });

    it('should fall back to AST parsing when a related source map is invalid', async () => {
      const plugin = createMockPluginInstance();
      const compilation = {
        compiler: { rspack: {} },
        options: {
          output: {
            filename: '[name].[contenthash].js',
          },
        },
        getAssets: () => [
          {
            name: 'main.js',
            source: {
              source: () => 'console.log("test");\n',
              name: 'main.js',
              sourceAndMap: () => ({
                source: 'console.log("test");\n',
                map: mockJsMap,
              }),
            },
            info: {},
          },
          {
            name: 'worker.abc123.js',
            source: {
              source: () => 'console.log("worker");\n',
              name: 'worker.abc123.js',
              sourceAndMap: () => ({
                source: 'console.log("worker");\n',
                map: null,
              }),
            },
            info: {
              related: {
                sourceMap: 'worker.abc123.js.map',
              },
            },
          },
          {
            name: 'worker.abc123.js.map',
            source: {
              source: () => '{}',
              name: 'worker.abc123.js.map',
            },
            info: {},
          },
        ],
      } as any;

      await handleAfterEmitAssets(compilation, plugin);
      expect(plugin.sourceMapSets.size).toBe(1);
      expect(plugin.assetsWithoutSourceMap).toEqual(
        new Set(['worker.abc123.js']),
      );
    });

    it('should find source map by base name without hash when exact match fails', async () => {
      const plugin = createMockPluginInstance();
      const compilation = {
        compiler: { rspack: {} },
        options: {
          output: {
            filename: '[name].[contenthash].js',
          },
        },
        getAssets: () => [
          {
            name: 'main.abc123.js',
            source: {
              source: () => 'console.log("test");\n',
              name: 'main.abc123.js',
              sourceAndMap: () => ({
                source: 'console.log("test");\n',
                map: null, // No inline source map
              }),
            },
            info: {
              related: {
                sourceMap: 'main.js.map', // Different hash in source map reference
              },
            },
          },
          {
            name: 'main.def456.js.map', // Different hash in actual file
            source: {
              source: () => JSON.stringify(mockJsMap),
              name: 'main.def456.js.map',
            },
            info: {},
          },
        ],
      } as any;

      await handleAfterEmitAssets(compilation, plugin);
      expect(plugin.sourceMapSets.size).toBe(1);
      const sourceMap = plugin.sourceMapSets.get(
        path.resolve(process.cwd(), 'src/index.js'),
      );
      expect(sourceMap).toBe('console.log("test");');
    });

    it('should handle source map file name extraction correctly', async () => {
      const plugin = createMockPluginInstance();
      const compilation = {
        compiler: { rspack: {} },
        options: {
          output: {
            filename: '[name].[contenthash].js',
          },
        },
        getAssets: () => [
          {
            name: 'app.abc123.js',
            source: {
              source: () => 'console.log("app");\n',
              name: 'app.abc123.js',
              sourceAndMap: () => ({
                source: 'console.log("app");\n',
                map: null,
              }),
            },
            info: {
              related: {
                sourceMap: 'app.abc123.js.map',
              },
            },
          },
          {
            name: 'app.def456.js.map', // Different hash
            source: {
              source: () =>
                JSON.stringify({
                  ...mockJsMap,
                  file: 'app.def456.js',
                  sources: ['src/app.js'],
                }),
              name: 'app.def456.js.map',
            },
            info: {},
          },
        ],
      } as any;

      await handleAfterEmitAssets(compilation, plugin);
      expect(plugin.sourceMapSets.size).toBe(1);
      const sourceMap = plugin.sourceMapSets.get(
        path.resolve(process.cwd(), 'src/app.js'),
      );
      expect(sourceMap).toBe('console.log("app");');
    });

    it('should skip processing when no source map file is referenced', async () => {
      const plugin = createMockPluginInstance();
      const compilation = {
        compiler: { rspack: {} },
        options: {
          output: {
            filename: '[name].[contenthash].js',
          },
        },
        getAssets: () => [
          {
            name: 'main.abc123.js',
            source: {
              source: () => 'console.log("test");\n',
              name: 'main.abc123.js',
              sourceAndMap: () => ({
                source: 'console.log("test");\n',
                map: null,
              }),
            },
            info: {
              related: {}, // No source map reference
            },
          },
        ],
      } as any;

      await handleAfterEmitAssets(compilation, plugin);
      expect(plugin.sourceMapSets.size).toBe(0);
    });

    it('should handle multiple file extensions in source map filename', async () => {
      const plugin = createMockPluginInstance();
      const compilation = {
        compiler: { rspack: {} },
        options: {
          output: {
            filename: '[name].[contenthash].js',
          },
        },
        getAssets: () => [
          {
            name: 'main.abc123.js',
            source: {
              source: () => 'console.log("test");\n',
              name: 'main.abc123.js',
              sourceAndMap: () => ({
                source: 'console.log("test");\n',
                map: null,
              }),
            },
            info: {
              related: {
                sourceMap: 'main.abc123.js.map', // Multiple extensions
              },
            },
          },
          {
            name: 'main.def456.js.map',
            source: {
              source: () => JSON.stringify(mockJsMap),
              name: 'main.def456.js.map',
            },
            info: {},
          },
        ],
      } as any;

      await handleAfterEmitAssets(compilation, plugin);
      expect(plugin.sourceMapSets.size).toBe(1);
      const sourceMap = plugin.sourceMapSets.get(
        path.resolve(process.cwd(), 'src/index.js'),
      );
      expect(sourceMap).toBe('console.log("test");');
    });
  });
});
