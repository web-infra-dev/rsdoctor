import path from 'path';
import { expect, describe, it } from '@rstest/core';
import { SDK } from '@rsdoctor/types';
import { Module, ModuleGraph, PackageGraph } from '../src/graph';
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
    expect(resultNoLayer[0].layer).toBeUndefined();
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
});
