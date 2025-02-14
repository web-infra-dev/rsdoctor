import unionBy from 'lodash.unionby';
import { resolve } from 'path';
import { SDK } from '@rsdoctor/types';
import { Package } from './package';
import { PackageDependency } from './dependency';
import { readPackageJson } from './utils';
export { readPackageJson } from './utils';

export class PackageGraph implements SDK.PackageGraphInstance {
  static fromModuleGraph(
    graph: SDK.ModuleGraphInstance,
    root: string,
    getPackageFile?: SDK.GetPackageFile,
  ): PackageGraph {
    const pkgGraph = new PackageGraph(root);
    const modules = graph
      .getModules()
      .filter((item) => item.kind === SDK.ModuleKind.Normal);

    // Generate all package data.
    for (const item of modules) {
      // If module don't have chunks,so this module's package no need to be counted.
      const itemChunks = item.getChunks();
      if (!itemChunks) continue;

      const pkg = pkgGraph.getPackageByModule(item, getPackageFile);

      if (pkg) {
        pkgGraph.addPackage(pkg);
        pkg.addModule(item);
      }
    }

    // Generate all dependent data.
    for (const dep of graph.getDependencies()) {
      const modulePkg = pkgGraph.getPackageByFile(dep.module.path);
      const dependencyPkg = pkgGraph.getPackageByFile(dep.dependency.path);

      if (modulePkg && dependencyPkg && !modulePkg.isSame(dependencyPkg)) {
        const pkgDep = new PackageDependency(modulePkg, dependencyPkg, dep);
        pkgGraph.addDependency(pkgDep);
        modulePkg.addDependency(pkgDep);
      }
    }

    return pkgGraph;
  }

  private _root: string;

  private _dependencies: SDK.PackageDependencyInstance[] = [];

  private _packages: SDK.PackageInstance[] = [];

  private _pkgNameMap = new Map<string, SDK.PackageInstance[]>();

  private _pkgFileMap = new Map<string, SDK.PackageInstance>();

  constructor(root: string) {
    this._root = root;
  }

  getPackages() {
    return this._packages.slice();
  }

  getPackageByModule(
    module: SDK.ModuleInstance,
    readFile?: SDK.GetPackageFile,
  ) {
    const { path: file, meta } = module;
    const { _pkgFileMap: pkgsMap } = this;
    const getPackageByData = (data: SDK.PackageBasicData) => {
      return (
        this.getPackageByData(data) ??
        new Package(data.name, data.root, data.version)
      );
    };

    if (pkgsMap.has(file)) {
      return pkgsMap.get(file);
    }

    if (meta.packageData) {
      const pkg = getPackageByData(meta.packageData);

      this.setDuplicates(module, pkg);
      pkgsMap.set(file, pkg);
      return pkg;
    }

    const cache = this.getPackageContainFile(file);

    if (cache) {
      pkgsMap.set(file, cache);
      return cache;
    }
    const data = readPackageJson(file, readFile);

    if (!data) {
      return;
    }

    if (data.root.startsWith('.')) {
      data.root = resolve(this._root, data.root);
    }

    const pkg = getPackageByData(data);

    this.setDuplicates(module, pkg);
    this.addPackage(pkg);
    pkgsMap.set(file, pkg);
    return pkg;
  }

  getPackageByFile(file: string) {
    return this._pkgFileMap.get(file);
  }

  getPackageContainFile(file: string) {
    return this._packages.find((pkg) => pkg.contain(file));
  }

  getPackagesByName(name: string) {
    return this._pkgNameMap.get(name) ?? [];
  }

  getPackageByData(data: SDK.PackageBasicData) {
    return this._pkgNameMap
      .get(data.name)
      ?.find(
        (item) => item.version === data.version && item.root === data.root,
      );
  }

  addPackage(pkg: SDK.PackageInstance) {
    if (this._packages.every((item) => !item.isSame(pkg))) {
      this._packages.push(pkg);

      const { _pkgNameMap: map } = this;
      const arr = map.get(pkg.name) ?? [];

      if (arr.every((item) => !item.isSame(pkg))) {
        arr.push(pkg);
        map.set(pkg.name, arr);
      }
    }
  }

  setDuplicates(module: SDK.ModuleInstance, pkg: SDK.PackageInstance) {
    const assetsList: SDK.AssetInstance[] = [];
    const chunksList = module.getChunks();
    chunksList.forEach((chunk) =>
      assetsList.push(
        ...chunk.getAssets().filter((asset) => asset.path.endsWith('.js')),
      ),
    );
    if (chunksList.length > 1) {
      pkg.setDuplicates({
        module: { id: module.id, path: module.path },
        chunks: assetsList.map((asset) => ({ name: asset.path })),
      });
    }
  }

  getDependenciesFromPackage(pkg: SDK.PackageInstance) {
    return this._dependencies.filter((dep) => dep.dependency === pkg);
  }

  addDependency(dep: SDK.PackageDependencyInstance) {
    if (this._dependencies.every((item) => !item.isSame(dep))) {
      this._dependencies.push(dep);
    }
  }

  getDependenciesFromOrigin() {
    return this._dependencies.filter((item) => !item.package);
  }

  getDuplicatePackages(): SDK.PackageInstance[][] {
    return unionBy(
      Array.from(this._pkgNameMap.values())
        .map((pkgs) => {
          return unionBy(pkgs, 'version');
        })
        .filter((pkgs) => pkgs.length > 1),
      (pkgs) => pkgs[0].name,
    );
  }

  toData(): SDK.PackageGraphData {
    return {
      packages: this._packages.map((e) => e.toData()),
      dependencies: this._dependencies.map((d) => d.toData()),
    };
  }
}
