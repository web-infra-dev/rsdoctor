import path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import { expect, describe, it, beforeEach } from '@rstest/core';
import { PackageGraph } from '../src/graph/package-graph/graph';
import { Module } from '../src/graph/module-graph/module';
import { Chunk } from '../src/graph/chunk-graph/chunk';
import { Asset } from '../src/graph/chunk-graph/asset';

describe('PackageGraph.getPackageByModule', () => {
  let pkgGraph: PackageGraph;
  const root = path.resolve(__dirname, 'fixture');

  beforeEach(() => {
    pkgGraph = new PackageGraph(root);
  });

  const getPackageFile = (path: string) => {
    try {
      const exists = fs.existsSync(path);
      if (exists) {
        const res = fse.readJsonSync(path);
        return res;
      }
    } catch (error) {
      const { message, stack } = error as Error;
    }
  };

  it('should return package from cache when file is already in _pkgFileMap', () => {
    const module = new Module(
      'webpack:///./src/index.js',
      path.join(root, 'index', 'index.js'),
    );
    const chunk = new Chunk('chunk-1', 'chunk-1', 1000, false, false);
    const asset = new Asset('bundle.js', 1000, [chunk], '');
    chunk.addAsset(asset);
    module.addChunk(chunk);

    const pkg1 = pkgGraph.getPackageByModule(module, getPackageFile);
    expect(pkg1).toBeDefined();

    const pkg2 = pkgGraph.getPackageByModule(module, getPackageFile);
    expect(pkg2).toBe(pkg1);
  });

  it('should return package from meta.packageData when available', () => {
    const module = new Module('webpack:///./src/index.js', './src/index.js');
    const chunk = new Chunk('chunk-1', 'chunk-1', 1000, false, false);
    const asset = new Asset('bundle.js', 1000, [chunk], '');
    chunk.addAsset(asset);
    module.addChunk(chunk);

    // @ts-ignore
    module.meta.packageData = {
      name: 'test-package',
      version: '1.0.0',
      root: root,
    };

    const pkg = pkgGraph.getPackageByModule(module, getPackageFile);
    expect(pkg).toBeDefined();
    expect(pkg?.name).toBe('test-package');
    expect(pkg?.version).toBe('1.0.0');
    expect(pkg?.root).toBe(root);
  });

  it('should return package from getPackageContainFile when file is contained in existing package', () => {
    const module1 = new Module(
      'webpack:///./src/index.js',
      path.join(root, 'index', 'index.js'),
    );
    const chunk1 = new Chunk('chunk-1', 'chunk-1', 1000, false, false);
    const asset1 = new Asset('bundle.js', 1000, [chunk1], '');
    chunk1.addAsset(asset1);
    module1.addChunk(chunk1);

    const pkg1 = pkgGraph.getPackageByModule(module1, getPackageFile);
    expect(pkg1).toBeDefined();

    const module2 = new Module(
      'webpack:///./src/other.js',
      path.join(root, 'index', 'other.js'),
    );
    const chunk2 = new Chunk('chunk-2', 'chunk-2', 1000, false, false);
    const asset2 = new Asset('bundle2.js', 1000, [chunk2], '');
    chunk2.addAsset(asset2);
    module2.addChunk(chunk2);

    const pkg2 = pkgGraph.getPackageByModule(module2, getPackageFile);
    expect(pkg2).toBe(pkg1);
  });

  it('should read package.json using getPackageFile when no cache or meta available', () => {
    const module = new Module(
      'webpack:///./src/index.js',
      path.join(root, 'index', 'index.js'),
    );
    const chunk = new Chunk('chunk-1', 'chunk-1', 1000, false, false);
    const asset = new Asset('bundle.js', 1000, [chunk], '');
    chunk.addAsset(asset);
    module.addChunk(chunk);

    const pkg = pkgGraph.getPackageByModule(module, getPackageFile);
    expect(pkg).toBeDefined();
    const packageJsonPath = path.join(root, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageData = fse.readJsonSync(packageJsonPath);
      expect(pkg?.name).toBe(packageData.name);
      expect(pkg?.version).toBe(packageData.version);
    }
  });

  it('should return undefined when package.json cannot be found', () => {
    const module = new Module(
      'webpack:///./src/index.js',
      '/non/existent/path/file.js',
    );
    const chunk = new Chunk('chunk-1', 'chunk-1', 1000, false, false);
    const asset = new Asset('bundle.js', 1000, [chunk], '');
    chunk.addAsset(asset);
    module.addChunk(chunk);

    const pkg = pkgGraph.getPackageByModule(module, getPackageFile);
    expect(pkg).toBeUndefined();
  });

  it('should handle getPackageFile errors gracefully', () => {
    const module = new Module(
      'webpack:///./src/index.js',
      path.join(root, 'index', 'index.js'),
    );
    const chunk = new Chunk('chunk-1', 'chunk-1', 1000, false, false);
    const asset = new Asset('bundle.js', 1000, [chunk], '');
    chunk.addAsset(asset);
    module.addChunk(chunk);

    let callCount = 0;
    const errorGetPackageFile = (pkgPath: string) => {
      callCount++;
      if (pkgPath.includes('index') && callCount <= 2) {
        return undefined;
      }
      if (pkgPath === path.join(root, 'package.json')) {
        return fse.readJsonSync(pkgPath);
      }
      return undefined;
    };

    const pkg = pkgGraph.getPackageByModule(module, errorGetPackageFile);
    expect(pkg).toBeDefined();
    expect(pkg?.name).toBe('@lodash/es');
  });

  it('should resolve relative root paths correctly', () => {
    const module = new Module(
      'webpack:///./src/index.js',
      path.join(root, 'index', 'index.js'),
    );
    const chunk = new Chunk('chunk-1', 'chunk-1', 1000, false, false);
    const asset = new Asset('bundle.js', 1000, [chunk], '');
    chunk.addAsset(asset);
    module.addChunk(chunk);

    const customGetPackageFile = (pkgPath: string) => {
      if (pkgPath.includes('package.json')) {
        return {
          name: 'test-pkg',
          version: '1.0.0',
          root: './relative/path',
        };
      }
    };

    const pkg = pkgGraph.getPackageByModule(module, customGetPackageFile);
    expect(pkg).toBeDefined();
    if (pkg) {
      expect(pkg.root).not.toContain('./');
      expect(path.isAbsolute(pkg.root)).toBe(true);
    }
  });

  it('should set duplicates when module has multiple chunks', () => {
    const module = new Module('webpack:///./src/index.js', './src/index.js');
    const chunk1 = new Chunk('chunk-1', 'chunk-1', 1000, false, false);
    const chunk2 = new Chunk('chunk-2', 'chunk-2', 1000, false, false);
    const asset1 = new Asset('bundle1.js', 1000, [chunk1], '');
    const asset2 = new Asset('bundle2.js', 1000, [chunk2], '');
    chunk1.addAsset(asset1);
    chunk2.addAsset(asset2);
    module.addChunk(chunk1);
    module.addChunk(chunk2);

    // @ts-ignore
    module.meta.packageData = {
      name: 'test-package',
      version: '1.0.0',
      root: root,
    };

    const pkg = pkgGraph.getPackageByModule(module, getPackageFile);
    expect(pkg).toBeDefined();
    expect(pkg?.duplicates.length).toBeGreaterThan(0);
    expect(pkg?.duplicates[0].chunks.length).toBe(2);
  });
});
