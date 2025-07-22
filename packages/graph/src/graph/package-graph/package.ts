import type { SDK } from '@rsdoctor/types';
import { relative } from 'path';
import { isPackagePath } from './utils';

let id = 1;

export class Package implements SDK.PackageInstance {
  id = id++;

  root: string;

  name: string;

  version: string;

  duplicates: SDK.CrossChunksPackageType[];

  private _modules: SDK.ModuleInstance[] = [];

  private _dependencies: SDK.PackageDependencyInstance[] = [];

  private _imported: SDK.PackageInstance[] = [];

  constructor(name: string, root: string, version: string) {
    this.name = name;
    this.root = root;
    this.version = version;
    this.duplicates = [];
  }

  setDuplicates(data: SDK.CrossChunksPackageType) {
    this.duplicates.push({
      module: data.module,
      chunks: data.chunks,
    });
  }

  getModules(): SDK.ModuleInstance[] {
    return this._modules.slice();
  }

  getDependencies(): SDK.PackageDependencyInstance[] {
    return this._dependencies.slice();
  }

  getImported(): SDK.PackageInstance[] {
    return this._imported.slice();
  }

  addModule(module: SDK.ModuleInstance) {
    if (!this._modules.includes(module)) {
      this._modules.push(module);
    }
  }

  addDependency(dep: SDK.PackageDependencyInstance) {
    if (this._dependencies.every((item) => !item.isSame(dep))) {
      this._dependencies.push(dep);
      dep.dependency.addImported(this);
    }
  }

  getDependenciesChain(graph: SDK.PackageGraphInstance) {
    function getImported(
      pkg: SDK.PackageInstance,
      ans: SDK.PackageDependencyInstance[],
    ): SDK.PackageDependencyInstance[] {
      const dependencies = graph.getDependenciesFromPackage(pkg);

      for (const dep of dependencies) {
        if (!dep.refDependency) {
          continue;
        }

        // The circular reference jumps out.
        if (ans.some((dep) => dep.dependency === pkg)) {
          continue;
        }

        // Go to the user's source code and end the query
        if (!dep.package) {
          return ans.concat(dep);
        }

        return getImported(dep.package, ans.concat(dep));
      }

      return ans;
    }

    return getImported(this, []);
  }

  addImported(pkg: SDK.PackageInstance) {
    if (!this._imported.includes(pkg)) {
      this._imported.push(pkg);
    }
  }

  contain(file: string) {
    const ifContain = file.includes(this.root);

    // Non-identical directories.
    if (!ifContain) {
      return false;
    }

    const subPath = relative(this.root, file);

    // Some modules will be in the node_modules of the current module, and another judgment needs to be made here.
    return !isPackagePath(subPath);
  }

  isSame(pkg: SDK.PackageInstance) {
    return (
      this.root === pkg.root &&
      this.version === pkg.version &&
      this.name === pkg.name
    );
  }

  getSize(): SDK.ModuleSize {
    return this._modules.reduce(
      (ans, item) => {
        const size = item.getSize();
        ans.sourceSize += size.sourceSize;
        ans.transformedSize += size.transformedSize;
        ans.parsedSize += size.parsedSize;
        ans.gzipSize += size.gzipSize;
        return ans;
      },
      {
        sourceSize: 0,
        transformedSize: 0,
        parsedSize: 0,
        gzipSize: 0,
      },
    );
  }

  toData(): SDK.PackageData {
    return {
      id: this.id,
      name: this.name,
      root: this.root,
      version: this.version,
      modules: this.getModules().map((e) => e.id),
      size: this.getSize(),
      duplicates: this.duplicates,
    };
  }
}
