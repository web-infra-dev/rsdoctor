import path from 'path';
import { expect, describe, it } from '@rstest/core';
import { SDK, Plugin } from '@rsdoctor/types';
import { Module, ModuleGraph, PackageGraph } from '../src/graph';
import { getModuleGraphByStats } from '../src/transform/module-graph/transform';
import { chunkTransform } from '../src/transform/chunks/chunkTransform';
// TODO: simplify the module-graph-basic.json data size.
const resolveFixture = (...paths: string[]) => {
  return path.resolve(__dirname, 'fixture', ...paths);
};

function arrayEq<T>(actual: T[], expected: T[]) {
  expect(actual.length).toBe(expected.length);
  expect(actual).toEqual(expect.arrayContaining(expected));
}

describe('module graph', () => {
  it('from space data', async () => {
    expect(ModuleGraph.fromData({}).toData()).toStrictEqual({
      modules: [],
      dependencies: [],
      exports: [],
      layers: [],
      moduleGraphModules: [],
      sideEffects: [],
      variables: [],
    });
  });

  it('from data basic', async () => {
    const inputData = require(
      resolveFixture('module-graph-basic.json'),
    ) as SDK.ModuleGraphData;
    const moduleGraph = ModuleGraph.fromData(inputData);

    expect(moduleGraph.size()).toBe(inputData.modules.length);

    inputData.modules.forEach((item) => {
      const module = moduleGraph.getModuleById(item.id)!;
      expect(module).toBeTruthy();
      expect(module.kind).toBe(item.kind);
      expect(module.getSize().sourceSize).toStrictEqual(item.size.sourceSize);
      expect(module.getSize().transformedSize).toStrictEqual(
        item.size.transformedSize,
      );
      expect(module.getSize().parsedSize).toStrictEqual(item.size.parsedSize);
      arrayEq(
        module.getDependencies().map((item) => item.id),
        item.dependencies,
      );
      arrayEq(
        module.getImported().map((item) => item.id),
        item.imported,
      );

      if (!item.meta) {
        expect(module.meta).toStrictEqual({
          hasSetEsModuleStatement: false,
          strictHarmonyModule: false,
        });
      } else {
        expect(module.meta.hasSetEsModuleStatement).toStrictEqual(
          item.meta.hasSetEsModuleStatement ?? false,
        );
        expect(module.meta.strictHarmonyModule).toStrictEqual(
          item.meta.strictHarmonyModule ?? false,
        );
      }
    });

    inputData.dependencies.forEach((item) => {
      const dependency = moduleGraph.getDependencyById(item.id)!;
      expect(dependency).toBeTruthy();
      expect(dependency.id).toBe(item.id);
      expect(dependency.request).toBe(item.request);
      expect(dependency.resolvedRequest).toBe(item.resolvedRequest);
      expect(dependency.module.id).toBe(item.module);
      expect(dependency.dependency.id).toBe(item.dependency);
    });

    const pkgGraph = PackageGraph.fromModuleGraph(moduleGraph, '.');
    const pkgData = pkgGraph.toData();
    expect(pkgData.packages[0].root).toBeTruthy();
    pkgData.packages.forEach((pkg) => (pkg.root = ''));
    expect(pkgData).toMatchSnapshot();
  });

  it('ModuleGraph toCodeMap', async () => {
    const _moduleGraph = new ModuleGraph();
    for (let i = 1; i < 10; i++) {
      const _mod = new Module(i.toString(), `index-${i}.js`);
      _mod.setSource({
        source: `source-${i}`,
        transformed: `source-${i}`,
        parsedSource: `source-${i}`,
      });
      _moduleGraph.addModule(_mod);
    }

    expect(_moduleGraph.toCodeData()).toMatchSnapshot();
  });

  it('getModuleByFile should return modules by file path', async () => {
    const moduleGraph = new ModuleGraph();
    const filePath = '/path/to/module.js';

    // Add module without layer
    const module1 = new Module('1', filePath);
    moduleGraph.addModule(module1);

    // Add module with different file path
    const module2 = new Module('2', '/path/to/other.js');
    moduleGraph.addModule(module2);

    const result = moduleGraph.getModuleByFile(filePath);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(module1.id);
    expect(result[0].path).toBe(filePath);
  });

  it('getModuleByFile should return all modules when multiple modules have same path but different layers', async () => {
    const moduleGraph = new ModuleGraph();
    const filePath = '/path/to/module.js';

    // Add module with layer 'legacy'
    const moduleLegacy = new Module(
      '1',
      filePath,
      false,
      SDK.ModuleKind.Normal,
      undefined,
      'legacy',
    );
    moduleGraph.addModule(moduleLegacy);

    // Add module with layer 'modern'
    const moduleModern = new Module(
      '2',
      filePath,
      false,
      SDK.ModuleKind.Normal,
      undefined,
      'modern',
    );
    moduleGraph.addModule(moduleModern);

    // Add module without layer
    const moduleNoLayer = new Module('3', filePath);
    moduleGraph.addModule(moduleNoLayer);

    // When layer is not specified, should return all matching modules
    const result = moduleGraph.getModuleByFile(filePath);
    expect(result.length).toBe(3);
    expect(result.map((m) => m.id).sort()).toEqual(
      [moduleLegacy.id, moduleModern.id, moduleNoLayer.id].sort(),
    );
  });

  it('getModuleByFile should filter by layer when layer parameter is provided', async () => {
    const moduleGraph = new ModuleGraph();
    const filePath = '/path/to/module.js';

    // Add module with layer 'legacy'
    const moduleLegacy = new Module(
      '1',
      filePath,
      false,
      SDK.ModuleKind.Normal,
      undefined,
      'legacy',
    );
    moduleGraph.addModule(moduleLegacy);

    // Add module with layer 'modern'
    const moduleModern = new Module(
      '2',
      filePath,
      false,
      SDK.ModuleKind.Normal,
      undefined,
      'modern',
    );
    moduleGraph.addModule(moduleModern);

    // Add module without layer
    const moduleNoLayer = new Module('3', filePath);
    moduleGraph.addModule(moduleNoLayer);

    // When layer 'legacy' is specified, should return only legacy module
    const resultLegacy = moduleGraph.getModuleByFile(filePath, 'legacy');
    expect(resultLegacy.length).toBe(1);
    expect(resultLegacy[0].id).toBe(moduleLegacy.id);
    expect(resultLegacy[0].layer).toBe('legacy');

    // When layer 'modern' is specified, should return only modern module
    const resultModern = moduleGraph.getModuleByFile(filePath, 'modern');
    expect(resultModern.length).toBe(1);
    expect(resultModern[0].id).toBe(moduleModern.id);
    expect(resultModern[0].layer).toBe('modern');

    // When layer is empty string, should return only module without layer
    const resultNoLayer = moduleGraph.getModuleByFile(filePath, '');
    expect(resultNoLayer.length).toBe(1);
    expect(resultNoLayer[0].id).toBe(moduleNoLayer.id);
    expect(resultNoLayer[0].layer).toBe('');
  });

  it('getModuleByFile should return empty array when no matching modules found', async () => {
    const moduleGraph = new ModuleGraph();
    const module = new Module('1', '/path/to/module.js');
    moduleGraph.addModule(module);

    const result = moduleGraph.getModuleByFile('/path/to/nonexistent.js');
    expect(result).toEqual([]);
  });

  it('getModuleByFile should return empty array when layer does not match', async () => {
    const moduleGraph = new ModuleGraph();
    const filePath = '/path/to/module.js';

    // Add module with layer 'legacy'
    const moduleLegacy = new Module(
      '1',
      filePath,
      false,
      SDK.ModuleKind.Normal,
      undefined,
      'legacy',
    );
    moduleGraph.addModule(moduleLegacy);

    // Query for 'modern' layer should return empty array
    const result = moduleGraph.getModuleByFile(filePath, 'modern');
    expect(result).toEqual([]);
  });

  describe('JSON file parsedSize handling', () => {
    it('should set parsedSize for JSON files from stats size', () => {
      const root = '/test/root';
      const stats: Plugin.StatsCompilation = {
        modules: [
          {
            identifier: 'json-module-1',
            name: './data.json',
            nameForCondition: './data.json',
            size: 1024,
            type: 'module',
            id: 1,
          },
          {
            identifier: 'js-module-1',
            name: './script.js',
            nameForCondition: './script.js',
            size: 2048,
            type: 'module',
            id: 2,
          },
          {
            identifier: 'json-module-2',
            name: './config.JSON',
            nameForCondition: './config.JSON',
            size: 512,
            type: 'module',
            id: 3,
          },
        ],
        chunks: [],
        assets: [],
      };

      const chunkGraph = chunkTransform(new Map(), stats);
      const moduleGraph = getModuleGraphByStats(stats, root, chunkGraph);

      // Check JSON file with lowercase extension
      const jsonModule1 = moduleGraph.getModuleByWebpackId('json-module-1');
      expect(jsonModule1).toBeTruthy();
      expect(jsonModule1?.getSize().parsedSize).toBe(1024);
      expect(jsonModule1?.getSize().sourceSize).toBe(1024);
      expect(jsonModule1?.getSize().transformedSize).toBe(1024);

      // Check JSON file with uppercase extension
      const jsonModule2 = moduleGraph.getModuleByWebpackId('json-module-2');
      expect(jsonModule2).toBeTruthy();
      expect(jsonModule2?.getSize().parsedSize).toBe(512);
      expect(jsonModule2?.getSize().sourceSize).toBe(512);
      expect(jsonModule2?.getSize().transformedSize).toBe(512);

      // Check non-JSON file should not have parsedSize set by this logic
      const jsModule = moduleGraph.getModuleByWebpackId('js-module-1');
      expect(jsModule).toBeTruthy();
      expect(jsModule?.getSize().sourceSize).toBe(2048);
      expect(jsModule?.getSize().transformedSize).toBe(2048);
      // parsedSize should be 0 (default) for non-JSON files
      expect(jsModule?.getSize().parsedSize).toBe(0);
    });

    it('should handle JSON files in concatenated modules', () => {
      const root = '/test/root';
      const stats: Plugin.StatsCompilation = {
        modules: [
          {
            identifier: 'concatenated-module',
            name: './concatenated.js',
            nameForCondition: './concatenated.js',
            size: 3072,
            type: 'module',
            id: 1,
            modules: [
              {
                identifier: 'json-in-concat',
                name: './nested.json',
                nameForCondition: './nested.json',
                size: 1024,
                type: 'module',
                id: 2,
              },
              {
                identifier: 'js-in-concat',
                name: './nested.js',
                nameForCondition: './nested.js',
                size: 2048,
                type: 'module',
                id: 3,
              },
            ],
          },
        ],
        chunks: [],
        assets: [],
      };

      const chunkGraph = chunkTransform(new Map(), stats);
      const moduleGraph = getModuleGraphByStats(stats, root, chunkGraph);

      // Check JSON file inside concatenated module
      const jsonModule = moduleGraph.getModuleByWebpackId('json-in-concat');
      expect(jsonModule).toBeTruthy();
      expect(jsonModule?.getSize().parsedSize).toBe(1024);
      expect(jsonModule?.getSize().sourceSize).toBe(1024);
      expect(jsonModule?.getSize().transformedSize).toBe(1024);

      // Check non-JSON file inside concatenated module
      const jsModule = moduleGraph.getModuleByWebpackId('js-in-concat');
      expect(jsModule).toBeTruthy();
      expect(jsModule?.getSize().sourceSize).toBe(2048);
      expect(jsModule?.getSize().transformedSize).toBe(2048);
      expect(jsModule?.getSize().parsedSize).toBe(0);
    });

    it('should handle files without size property', () => {
      const root = '/test/root';
      const stats: Plugin.StatsCompilation = {
        modules: [
          {
            identifier: 'json-no-size',
            name: './data.json',
            nameForCondition: './data.json',
            type: 'module',
            id: 1,
          },
        ],
        chunks: [],
        assets: [],
      };

      const chunkGraph = chunkTransform(new Map(), stats);
      const moduleGraph = getModuleGraphByStats(stats, root, chunkGraph);

      const jsonModule = moduleGraph.getModuleByWebpackId('json-no-size');
      expect(jsonModule).toBeTruthy();
      // When size is not provided, parsedSize should remain 0 (default)
      expect(jsonModule?.getSize().parsedSize).toBe(0);
    });

    it('should handle JSON files with absolute paths', () => {
      const root = '/test/root';
      const stats: Plugin.StatsCompilation = {
        modules: [
          {
            identifier: 'json-absolute',
            name: '/absolute/path/to/data.json',
            nameForCondition: '/absolute/path/to/data.json',
            size: 256,
            type: 'module',
            id: 1,
          },
        ],
        chunks: [],
        assets: [],
      };

      const chunkGraph = chunkTransform(new Map(), stats);
      const moduleGraph = getModuleGraphByStats(stats, root, chunkGraph);

      const jsonModule = moduleGraph.getModuleByWebpackId('json-absolute');
      expect(jsonModule).toBeTruthy();
      expect(jsonModule?.getSize().parsedSize).toBe(256);
    });
  });
});
