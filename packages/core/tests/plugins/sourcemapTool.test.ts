import { describe, it, expect } from '@rstest/core';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  bindContextCache,
  collectSourceMaps,
  handleAfterEmitAssets,
} from '../../src/inner-plugins/plugins/sourcemapTool';

// Read the real source map and bundle as test fixtures
const jsMapPath = path.resolve(
  __dirname,
  '../../../../examples/rspack-banner-minimal/dist/main.js.map',
);
const jsPath = path.resolve(
  __dirname,
  '../../../../examples/rspack-banner-minimal/dist/main.js',
);

const jsMap = JSON.parse(fs.readFileSync(jsMapPath, 'utf-8'));
const jsContent = fs.readFileSync(jsPath, 'utf-8');
const jsLines = jsContent.split(/\r?\n/);

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
    it('should resolve normal and webpack:// sources', () => {
      const context = '/project';
      const namespace = 'foo';
      const cache = new Map();
      const regex = /webpack:\/\/(?:foo)?([^?]*)/;
      const fn = bindContextCache(context, namespace, cache);
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

    it('should resolve relative paths based on sourceMapDir or sourceRoot', () => {
      const context = '/project/dist';

      // Case 1: No sourceRoot, use sourceMapDir
      const fn1 = bindContextCache(
        context,
        undefined,
        new Map(),
        '/project/dist/js',
      );
      expect(fn1('../src/utils.js')).toBe(
        path.resolve('/project/dist/js', '../src/utils.js'),
      );

      // Case 2: sourceRoot is absolute
      const fn2 = bindContextCache(
        context,
        undefined,
        new Map(),
        '/project/dist/js',
        '/project/src',
      );
      expect(fn2('utils.js')).toBe(path.resolve('/project/src', 'utils.js'));

      // Case 3: sourceRoot is relative, use sourceMapDir as base
      const fn3 = bindContextCache(
        context,
        undefined,
        new Map(),
        '/project/dist/js',
        '../src',
      );
      // resolve('/project/dist/js', '../src', 'utils.js') -> /project/dist/src/utils.js
      expect(fn3('utils.js')).toBe(
        path.resolve('/project/dist/js', '../src', 'utils.js'),
      );

      // Case 4: sourceRoot is relative, no sourceMapDir, use context as base
      const fn4 = bindContextCache(
        context,
        undefined,
        new Map(),
        undefined,
        '../src',
      );
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
    it('should collect code segments for real sources', async () => {
      const plugin = createMockPluginInstance();
      const compilation = createMockCompilation();
      const regex =
        /webpack:\/\/(?:@examples\/rsdoctor-rspack-banner\/)?([^?]*)/;
      await collectSourceMaps(jsMap, jsLines, compilation, plugin, regex);
      // Assert that sourceMapSets is filled
      expect(plugin.sourceMapSets.size).toBeGreaterThan(0);
      // Assert that there is a key related to dayjs.min.js
      const hasDayjs = Array.from(plugin.sourceMapSets.keys()).some(
        (k: unknown) => typeof k === 'string' && k.includes('dayjs.min.js'),
      );
      expect(hasDayjs).toBe(true);
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

  describe('asset no map - assetsWithoutSourceMap tracking', () => {
    it('should add JS asset to assetsWithoutSourceMap when no sourcemap exists', async () => {
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
            name: 'bundle.abc123.js',
            source: {
              source: () => 'console.log("test");\n',
              name: 'bundle.abc123.js',
              sourceAndMap: () => ({
                source: 'console.log("test");\n',
                map: null, // No inline source map
              }),
            },
            info: {
              related: {}, // No source map reference
            },
          },
        ],
      } as any;

      await handleAfterEmitAssets(compilation, plugin);

      // The asset should be marked as having no sourcemap
      expect(plugin.assetsWithoutSourceMap).toBeDefined();
      expect(plugin.assetsWithoutSourceMap.has('bundle.abc123.js')).toBe(true);
      expect(plugin.assetsWithoutSourceMap.size).toBe(1);
      // No sourcemap data should be collected
      expect(plugin.sourceMapSets.size).toBe(0);
    });

    it('should add CSS asset to assetsWithoutSourceMap when no sourcemap exists', async () => {
      const plugin = createMockPluginInstance();
      const compilation = {
        compiler: { rspack: {} },
        options: {
          output: {},
        },
        getAssets: () => [
          {
            name: 'styles.css',
            source: {
              source: () => '.header { color: red; }\n',
              name: 'styles.css',
              sourceAndMap: () => ({
                source: '.header { color: red; }\n',
                map: null,
              }),
            },
            info: {
              related: {},
            },
          },
        ],
      } as any;

      await handleAfterEmitAssets(compilation, plugin);

      expect(plugin.assetsWithoutSourceMap).toBeDefined();
      expect(plugin.assetsWithoutSourceMap.has('styles.css')).toBe(true);
      expect(plugin.assetsWithoutSourceMap.size).toBe(1);
      expect(plugin.sourceMapSets.size).toBe(0);
    });

    it('should NOT add asset to assetsWithoutSourceMap when inline sourcemap exists', async () => {
      const plugin = createMockPluginInstance();
      const compilation = createMockCompilation();

      await handleAfterEmitAssets(compilation, plugin);

      // Asset has inline sourcemap, should not be in assetsWithoutSourceMap
      expect(plugin.assetsWithoutSourceMap).toBeDefined();
      expect(plugin.assetsWithoutSourceMap.has('main.js')).toBe(false);
      expect(plugin.assetsWithoutSourceMap.size).toBe(0);
      // Sourcemap data should be collected
      expect(plugin.sourceMapSets.size).toBe(1);
    });

    it('should NOT add asset to assetsWithoutSourceMap when external sourcemap file exists', async () => {
      const plugin = createMockPluginInstance();
      const compilation = {
        compiler: { rspack: {} },
        options: {
          output: {},
        },
        getAssets: () => [
          {
            name: 'app.js',
            source: {
              source: () => 'console.log("app");\n',
              name: 'app.js',
              sourceAndMap: () => ({
                source: 'console.log("app");\n',
                map: null, // No inline map
              }),
            },
            info: {
              related: {
                sourceMap: 'app.js.map', // But has external map reference
              },
            },
          },
          {
            name: 'app.js.map',
            source: {
              source: () => JSON.stringify(mockJsMap),
              name: 'app.js.map',
            },
            info: {},
          },
        ],
      } as any;

      await handleAfterEmitAssets(compilation, plugin);

      // Asset has external sourcemap file, should not be in assetsWithoutSourceMap
      expect(plugin.assetsWithoutSourceMap).toBeDefined();
      expect(plugin.assetsWithoutSourceMap.has('app.js')).toBe(false);
      expect(plugin.assetsWithoutSourceMap.size).toBe(0);
      // Sourcemap data should be collected from external file
      expect(plugin.sourceMapSets.size).toBe(1);
    });

    it('should track multiple assets without sourcemap', async () => {
      const plugin = createMockPluginInstance();
      const compilation = {
        compiler: { rspack: {} },
        options: {
          output: {},
        },
        getAssets: () => [
          {
            name: 'main.js',
            source: {
              source: () => 'console.log("main");\n',
              name: 'main.js',
              sourceAndMap: () => ({
                source: 'console.log("main");\n',
                map: null,
              }),
            },
            info: {
              related: {},
            },
          },
          {
            name: 'vendor.js',
            source: {
              source: () => 'console.log("vendor");\n',
              name: 'vendor.js',
              sourceAndMap: () => ({
                source: 'console.log("vendor");\n',
                map: null,
              }),
            },
            info: {
              related: {},
            },
          },
          {
            name: 'styles.css',
            source: {
              source: () => '.app { color: blue; }\n',
              name: 'styles.css',
              sourceAndMap: () => ({
                source: '.app { color: blue; }\n',
                map: null,
              }),
            },
            info: {
              related: {},
            },
          },
        ],
      } as any;

      await handleAfterEmitAssets(compilation, plugin);

      expect(plugin.assetsWithoutSourceMap).toBeDefined();
      expect(plugin.assetsWithoutSourceMap.size).toBe(3);
      expect(plugin.assetsWithoutSourceMap.has('main.js')).toBe(true);
      expect(plugin.assetsWithoutSourceMap.has('vendor.js')).toBe(true);
      expect(plugin.assetsWithoutSourceMap.has('styles.css')).toBe(true);
      expect(plugin.sourceMapSets.size).toBe(0);
    });

    it('should NOT add non-JS/CSS assets to assetsWithoutSourceMap', async () => {
      const plugin = createMockPluginInstance();
      const compilation = {
        compiler: { rspack: {} },
        options: {
          output: {},
        },
        getAssets: () => [
          {
            name: 'image.png',
            source: {
              source: () => Buffer.from('fake-image-data'),
              name: 'image.png',
              sourceAndMap: () => ({
                source: Buffer.from('fake-image-data'),
                map: null,
              }),
            },
            info: {
              related: {},
            },
          },
          {
            name: 'data.json',
            source: {
              source: () => '{"key": "value"}',
              name: 'data.json',
              sourceAndMap: () => ({
                source: '{"key": "value"}',
                map: null,
              }),
            },
            info: {
              related: {},
            },
          },
        ],
      } as any;

      await handleAfterEmitAssets(compilation, plugin);

      // Non-JS/CSS assets should not be tracked
      expect(plugin.assetsWithoutSourceMap).toBeDefined();
      expect(plugin.assetsWithoutSourceMap.size).toBe(0);
      expect(plugin.sourceMapSets.size).toBe(0);
    });

    it('should handle mixed scenario: assets with and without sourcemap', async () => {
      const plugin = createMockPluginInstance();
      const compilation = {
        compiler: { rspack: {} },
        options: {
          output: {},
        },
        getAssets: () => [
          // Asset WITH inline sourcemap
          {
            name: 'with-map.js',
            source: {
              source: () => 'console.log("with map");\n',
              name: 'with-map.js',
              sourceAndMap: () => ({
                source: 'console.log("with map");\n',
                map: mockJsMap,
              }),
            },
            info: {},
          },
          // Asset WITHOUT sourcemap
          {
            name: 'no-map.js',
            source: {
              source: () => 'console.log("no map");\n',
              name: 'no-map.js',
              sourceAndMap: () => ({
                source: 'console.log("no map");\n',
                map: null,
              }),
            },
            info: {
              related: {},
            },
          },
        ],
      } as any;

      await handleAfterEmitAssets(compilation, plugin);

      // Only the asset without sourcemap should be tracked
      expect(plugin.assetsWithoutSourceMap).toBeDefined();
      expect(plugin.assetsWithoutSourceMap.size).toBe(1);
      expect(plugin.assetsWithoutSourceMap.has('no-map.js')).toBe(true);
      expect(plugin.assetsWithoutSourceMap.has('with-map.js')).toBe(false);
      // Sourcemap data should only be collected from asset with map
      expect(plugin.sourceMapSets.size).toBe(1);
    });

    it('should clear assetsWithoutSourceMap on subsequent calls', async () => {
      const plugin = createMockPluginInstance();
      const compilation1 = {
        compiler: { rspack: {} },
        options: { output: {} },
        getAssets: () => [
          {
            name: 'bundle1.js',
            source: {
              source: () => 'console.log("1");\n',
              name: 'bundle1.js',
              sourceAndMap: () => ({
                source: 'console.log("1");\n',
                map: null,
              }),
            },
            info: { related: {} },
          },
        ],
      } as any;

      await handleAfterEmitAssets(compilation1, plugin);
      expect(plugin.assetsWithoutSourceMap.size).toBe(1);
      expect(plugin.assetsWithoutSourceMap.has('bundle1.js')).toBe(true);

      // Second call with different assets
      const compilation2 = {
        compiler: { rspack: {} },
        options: { output: {} },
        getAssets: () => [
          {
            name: 'bundle2.js',
            source: {
              source: () => 'console.log("2");\n',
              name: 'bundle2.js',
              sourceAndMap: () => ({
                source: 'console.log("2");\n',
                map: null,
              }),
            },
            info: { related: {} },
          },
        ],
      } as any;

      await handleAfterEmitAssets(compilation2, plugin);
      // Should clear previous entries and only have new ones
      expect(plugin.assetsWithoutSourceMap.size).toBe(1);
      expect(plugin.assetsWithoutSourceMap.has('bundle1.js')).toBe(false);
      expect(plugin.assetsWithoutSourceMap.has('bundle2.js')).toBe(true);
    });
  });
});
