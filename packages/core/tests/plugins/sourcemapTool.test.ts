import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  bindContextCache,
  collectSourceMaps,
  handleEmitAssets,
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
    compiler: { webpack: {} },
    getAssets: () => ({
      'main.js': {
        name: 'main.js',
        source: () => jsContent,
        sourceAndMap: () => ({ source: jsContent, map: jsMap }),
        info: {},
      },
      'main.js.map': {
        name: 'main.js.map',
        source: { source: () => JSON.stringify(jsMap) },
        info: {},
      },
    }),
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
      await collectSourceMaps(
        jsMap,
        jsLines,
        compilation,
        plugin,
        regex,
        '@examples/rsdoctor-rspack-banner',
      );
      // Assert that sourceMapSets is filled
      expect(plugin.sourceMapSets.size).toBeGreaterThan(0);
      // Assert that there is a key related to dayjs.min.js
      const hasDayjs = Array.from(plugin.sourceMapSets.keys()).some(
        (k: unknown) => typeof k === 'string' && k.includes('dayjs.min.js'),
      );
      expect(hasDayjs).toBe(true);
    });
  });

  describe('handleEmitAssets', () => {
    it('should process assets and fill sourceMapSets', async () => {
      const plugin = createMockPluginInstance();
      const compilation = createMockCompilation();
      const regex =
        /webpack:\/\/(?:@examples\/rsdoctor-rspack-banner\/)?([^?]*)/;
      await handleEmitAssets({
        compilation,
        pluginInstance: plugin,
        sourceMapFilenameRegex: regex,
        namespace: '@examples/rsdoctor-rspack-banner',
      });
      // Assert that sourceMapSets is filled
      expect(plugin.sourceMapSets.size).toBeGreaterThan(0);
    });
  });
});
