import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from '@rstest/core';
import { buildChunkGroupGraphReport } from '@/build-utils/build/chunks/chunkGroupReport';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('buildChunkGroupGraphReport', () => {
  it('collects removable modules and dynamic import origin details', () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'rsdoctor-chunk-group-'),
    );
    tempDirs.push(tempDir);

    const entryFile = path.join(tempDir, 'entry.js');
    const asyncFile = path.join(tempDir, 'async.js');
    const unusedFile = path.join(tempDir, 'unused.js');

    fs.writeFileSync(entryFile, "import('./async')\nconsole.log('entry')\n");
    fs.writeFileSync(asyncFile, "export const value = 'async'\n");
    fs.writeFileSync(unusedFile, "export const value = 'unused'\n");

    const entryModule = {
      resource: entryFile,
      identifier: () => entryFile,
      nameForCondition: () => entryFile,
      readableIdentifier: () => entryFile,
      blocks: [{ dependencies: ['dep_async'] }],
    };
    const asyncModule = {
      resource: asyncFile,
      identifier: () => asyncFile,
      nameForCondition: () => asyncFile,
      readableIdentifier: () => asyncFile,
    };
    const unusedModule = {
      resource: unusedFile,
      identifier: () => unusedFile,
      nameForCondition: () => unusedFile,
      readableIdentifier: () => unusedFile,
    };

    const entryChunk = {
      id: 'entry-chunk',
      name: 'main',
      files: ['main.js'],
    };
    const asyncChunk = {
      id: 'async-chunk',
      name: 'async',
      files: ['async.js'],
    };

    const chunkModules = new Map<any, any[]>([
      [entryChunk, [entryModule]],
      [asyncChunk, [asyncModule, unusedModule]],
    ]);

    const chunkEntries = new Map<any, any[]>([
      [entryChunk, [entryModule]],
      [asyncChunk, [asyncModule]],
    ]);

    const moduleSizes = new Map<any, number>([
      [entryModule, 40],
      [asyncModule, 30],
      [unusedModule, 25],
    ]);

    const asyncGroup = {
      name: 'async-group',
      isInitial: () => false,
      chunks: [asyncChunk],
      origins: [
        {
          request: './async',
          module: entryModule,
          loc: {
            start: { line: 1, column: 0 },
            end: { line: 1, column: 17 },
          },
        },
      ],
    };

    const compilation = {
      requestShortener: undefined,
      chunks: [entryChunk, asyncChunk],
      chunkGroups: [
        {
          name: 'entry-group',
          isInitial: () => true,
          chunks: [entryChunk],
          origins: [],
        },
        asyncGroup,
      ],
      assets: {
        'main.js': { size: () => 120 },
        'async.js': { size: () => 64 },
      },
      chunkGraph: {
        getChunkModulesIterable(chunk: any) {
          return chunkModules.get(chunk) ?? [];
        },
        getChunkEntryModulesIterable(chunk: any) {
          return chunkEntries.get(chunk) ?? [];
        },
        getModuleSize(module: any) {
          return moduleSizes.get(module) ?? 0;
        },
      },
      moduleGraph: {
        getModule(dep: string) {
          if (dep === 'dep_async') {
            return asyncModule;
          }
          return undefined;
        },
        getOutgoingConnections(module: any) {
          if (module === asyncModule) {
            return [];
          }
          return [];
        },
        getIncomingConnections() {
          return [];
        },
        getParentBlock() {
          return null;
        },
      },
    };

    const report = buildChunkGroupGraphReport(compilation, tempDir);

    expect(report).toBeTruthy();
    expect(report?.nodes).toHaveLength(2);
    expect(report?.edges).toHaveLength(1);
    expect(report?.overview.totalGroupCount).toBe(2);
    expect(report?.overview.entryGroupCount).toBe(1);
    expect(report?.overview.asyncGroupCount).toBe(1);
    expect(report?.entryNodeIds).toEqual(['cg_0']);
    expect(report?.priorityNodeIds[0]).toBe('cg_1');

    const asyncNode = report?.nodes.find((node) => node.name === 'async-group');
    expect(asyncNode).toBeTruthy();
    expect(asyncNode?.localRemovableJSModuleCount).toBe(1);
    expect(asyncNode?.localRemovableJSSize).toBe(25);
    expect(asyncNode?.removableJSModuleCount).toBe(1);
    expect(asyncNode?.removableJSSize).toBe(25);
    expect(asyncNode?.inheritedRemovableJSModuleCount).toBe(0);
    expect(asyncNode?.inheritedRemovableJSSize).toBe(0);
    expect(asyncNode?.removableJSModules[0].resource).toBe('unused.js');
    expect(asyncNode?.localRemovableJSModules[0].resource).toBe('unused.js');
    expect(asyncNode?.incomingImports).toHaveLength(1);
    expect(asyncNode?.incomingImports[0].fromName).toBe('entry-group');
    expect(asyncNode?.pathCount).toBe(1);
    expect(asyncNode?.pathsTruncated).toBe(false);
    expect(asyncNode?.paths[0].label).toBe('entry-group → async-group');
    expect(asyncNode?.paths[0].unnecessarySize).toBe(25);
    expect(asyncNode?.paths[0].topUnnecessaryModules[0].resource).toBe(
      'unused.js',
    );
    expect(asyncNode?.worstPathSeverity).toBe('warning');

    const edge = report?.edges[0];
    expect(edge?.fromName).toBe('entry-group');
    expect(edge?.toName).toBe('async-group');
    expect(edge?.imports).toHaveLength(1);
    expect(edge?.imports[0].request).toBe('./async');
    expect(edge?.imports[0].loc).toContain('entry.js:1:0');
    expect(edge?.imports[0].snippet).toContain("import('./async')");
  });

  it('deduplicates removable size that is already guaranteed to load on every parent path', () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'rsdoctor-chunk-group-inherited-'),
    );
    tempDirs.push(tempDir);

    const entryFile = path.join(tempDir, 'entry.js');
    const parentFile = path.join(tempDir, 'parent.js');
    const childFile = path.join(tempDir, 'child.js');
    const sharedUnusedFile = path.join(tempDir, 'shared-unused.js');

    fs.writeFileSync(entryFile, "import('./parent')\n");
    fs.writeFileSync(parentFile, "import('./child')\n");
    fs.writeFileSync(childFile, "export const child = true\n");
    fs.writeFileSync(sharedUnusedFile, "export const unused = true\n");

    const entryModule = {
      resource: entryFile,
      identifier: () => entryFile,
      nameForCondition: () => entryFile,
      readableIdentifier: () => entryFile,
      blocks: [{ dependencies: ['dep_parent'] }],
    };
    const parentModule = {
      resource: parentFile,
      identifier: () => parentFile,
      nameForCondition: () => parentFile,
      readableIdentifier: () => parentFile,
      blocks: [{ dependencies: ['dep_child'] }],
    };
    const childModule = {
      resource: childFile,
      identifier: () => childFile,
      nameForCondition: () => childFile,
      readableIdentifier: () => childFile,
    };
    const sharedUnusedModule = {
      resource: sharedUnusedFile,
      identifier: () => sharedUnusedFile,
      nameForCondition: () => sharedUnusedFile,
      readableIdentifier: () => sharedUnusedFile,
    };

    const entryChunk = {
      id: 'entry-chunk',
      name: 'entry',
      files: ['entry.js'],
    };
    const parentChunk = {
      id: 'parent-chunk',
      name: 'parent',
      files: ['parent.js'],
    };
    const childChunk = {
      id: 'child-chunk',
      name: 'child',
      files: ['child.js'],
    };

    const chunkModules = new Map<any, any[]>([
      [entryChunk, [entryModule]],
      [parentChunk, [parentModule, sharedUnusedModule]],
      [childChunk, [childModule, sharedUnusedModule]],
    ]);

    const chunkEntries = new Map<any, any[]>([
      [entryChunk, [entryModule]],
      [parentChunk, [parentModule]],
      [childChunk, [childModule]],
    ]);

    const moduleSizes = new Map<any, number>([
      [entryModule, 10],
      [parentModule, 20],
      [childModule, 15],
      [sharedUnusedModule, 1024 * 1024],
    ]);

    const compilation = {
      requestShortener: undefined,
      chunks: [entryChunk, parentChunk, childChunk],
      chunkGroups: [
        {
          name: 'entry-group',
          isInitial: () => true,
          chunks: [entryChunk],
          origins: [],
        },
        {
          name: 'parent-group',
          isInitial: () => false,
          chunks: [parentChunk],
          origins: [
            {
              request: './parent',
              dependency: 'dep_parent',
              module: entryModule,
              loc: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 18 },
              },
            },
          ],
        },
        {
          name: 'child-group',
          isInitial: () => false,
          chunks: [childChunk],
          origins: [
            {
              request: './child',
              dependency: 'dep_child',
              module: parentModule,
              loc: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 17 },
              },
            },
          ],
        },
      ],
      assets: {
        'entry.js': { size: () => 40 },
        'parent.js': { size: () => 50 },
        'child.js': { size: () => 60 },
      },
      chunkGraph: {
        getChunkModulesIterable(chunk: any) {
          return chunkModules.get(chunk) ?? [];
        },
        getChunkEntryModulesIterable(chunk: any) {
          return chunkEntries.get(chunk) ?? [];
        },
        getModuleSize(module: any) {
          return moduleSizes.get(module) ?? 0;
        },
      },
      moduleGraph: {
        getModule(dep: string) {
          if (dep === 'dep_parent') {
            return parentModule;
          }
          if (dep === 'dep_child') {
            return childModule;
          }
          return undefined;
        },
        getOutgoingConnections() {
          return [];
        },
        getIncomingConnections() {
          return [];
        },
        getParentBlock() {
          return null;
        },
      },
    };

    const report = buildChunkGroupGraphReport(compilation, tempDir);

    expect(report).toBeTruthy();

    const parentNode = report?.nodes.find((node) => node.name === 'parent-group');
    const childNode = report?.nodes.find((node) => node.name === 'child-group');

    expect(parentNode).toBeTruthy();
    expect(parentNode?.localRemovableJSSize).toBe(1024 * 1024);
    expect(parentNode?.removableJSSize).toBe(1024 * 1024);

    expect(childNode).toBeTruthy();
    expect(childNode?.localRemovableJSSize).toBe(1024 * 1024);
    expect(childNode?.removableJSSize).toBe(0);
    expect(childNode?.removableJSModuleCount).toBe(0);
    expect(childNode?.inheritedRemovableJSSize).toBe(1024 * 1024);
    expect(childNode?.inheritedRemovableJSModuleCount).toBe(1);
    expect(childNode?.inheritedRemovableJSModules[0].resource).toBe(
      'shared-unused.js',
    );
    expect(childNode?.paths).toHaveLength(1);
    expect(childNode?.paths[0].unnecessarySize).toBe(1024 * 1024);
    expect(childNode?.paths[0].severity).toBe('danger');
    expect(report?.priorityNodeIds.slice(0, 2)).toEqual(['cg_1', 'cg_2']);
    expect(report?.overview.dangerPathCount).toBe(2);
    expect(report?.overview.warningPathCount).toBe(0);
  });
});
