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
      const sourceMap = plugin.sourceMapSets.get('src/index.js');
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
      const sourceMap = plugin.sourceMapSets.get('src/index.js');
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
      const sourceMap = plugin.sourceMapSets.get('src/index.js');
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
      const sourceMap = plugin.sourceMapSets.get('src/app.js');
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
      const sourceMap = plugin.sourceMapSets.get('src/index.js');
      expect(sourceMap).toBe('console.log("test");');
    });
  });
});
