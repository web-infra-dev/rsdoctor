import type { SDK } from '@rsdoctor/types';

let id = 1;

export class PackageDependency implements SDK.PackageDependencyInstance {
  id = id++;

  dependency: SDK.PackageInstance;

  package: SDK.PackageInstance;

  refDependency: SDK.DependencyInstance;

  constructor(
    pack: SDK.PackageInstance,
    dep: SDK.PackageInstance,
    refDependency: SDK.DependencyInstance,
  ) {
    this.package = pack;
    this.dependency = dep;
    this.refDependency = refDependency;
  }

  get name() {
    return this.dependency.name;
  }

  get version() {
    return this.dependency.version;
  }

  get root() {
    return this.dependency.root;
  }

  isSame(dep: SDK.PackageDependencyInstance) {
    return (
      this.refDependency === dep.refDependency &&
      this.dependency.isSame(dep.dependency)
    );
  }

  toData(): SDK.PackageDependencyData {
    return {
      id: this.id,
      dependency: this.dependency.id,
      package: this.package.id,
      refDependency: this.refDependency.id,
    };
  }
}
