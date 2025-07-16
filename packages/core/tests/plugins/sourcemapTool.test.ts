import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  bindContextCache,
  collectSourceMaps,
  handleEmitAssets,
} from '../../src/inner-plugins/plugins/sourcemapTool';

// 读取真实的 source map 和 bundle 作为测试夹具
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

// mock RsdoctorPluginInstance 和 Compilation
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
      // 普通路径
      expect(fn('src/index.js', regex)).toMatch(/\/project\/src\/index\.js$/);
      // webpack:// 路径
      expect(fn('webpack://foo/src/index.js', regex)).toMatch(
        /src\/index\.js$/,
      );
      // 未匹配
      expect(fn('webpack://bar/other.js', regex)).toBe('/project/bar/other.js');
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
      // 断言 sourceMapSets 被填充
      expect(plugin.sourceMapSets.size).toBeGreaterThan(0);
      // 断言有 dayjs.min.js 相关的 key
      const hasDayjs = Array.from(plugin.sourceMapSets.keys()).some((k) =>
        k.includes('dayjs.min.js'),
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
      expect(plugin.sourceMapSets.size).toBeGreaterThan(0);
    });
  });
});
