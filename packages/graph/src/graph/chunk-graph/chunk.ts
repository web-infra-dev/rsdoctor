import { SDK } from '@rsdoctor/types';

export class Chunk implements SDK.ChunkInstance {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly initial: boolean;
  readonly entry: boolean;
  private _assets: SDK.AssetInstance[] = [];
  private _modules: SDK.ModuleInstance[] = [];
  private _dependencies: SDK.ChunkInstance[] = [];
  private _imported: SDK.ChunkInstance[] = [];
  private _parsedSize: number | undefined;

  constructor(
    id: string,
    name: string,
    size: number,
    initial: boolean,
    entry: boolean,
  ) {
    this.id = id;
    this.name = name;
    this.size = size;
    this.initial = initial;
    this.entry = entry;
  }

  isEntry() {
    return this.entry;
  }

  isChunkEntryModule(module: SDK.ModuleInstance) {
    // The module is the project entrance, or the modules that rely on this module are not in the current Chunk.
    return (
      module.isEntry ||
      module.getImported().every((item) => !this.hasModule(item))
    );
  }

  hasModule(module: SDK.ModuleInstance) {
    return this._modules.includes(module);
  }

  addModule(module: SDK.ModuleInstance) {
    if (!this.hasModule(module)) {
      this._modules.push(module);
      module.addChunk(this);
    }
  }

  addAsset(asset: SDK.AssetInstance) {
    this._assets.push(asset);
  }

  addModules(modules: SDK.ModuleInstance[]) {
    modules.forEach((module: SDK.ModuleInstance) => {
      if (!this.hasModule(module)) {
        this._modules.push(module);
        module.addChunk(this);
      }
    });
  }

  addDependency(dep: SDK.ChunkInstance): void {
    if (!this._dependencies.includes(dep)) {
      this._dependencies.push(dep);
    }
  }

  addImported(imported: SDK.ChunkInstance): void {
    if (!this._imported.includes(imported)) {
      this._imported.push(imported);
    }
  }

  getAssets(): SDK.AssetInstance[] {
    return this._assets.slice();
  }

  getModules(): SDK.ModuleInstance[] {
    return this._modules.slice();
  }

  getDependencies(): SDK.ChunkInstance[] {
    return this._dependencies.slice();
  }

  getImported(): SDK.ChunkInstance[] {
    return this._imported.slice();
  }

  setParsedSize(parsedSize: number) {
    this._parsedSize = parsedSize;
  }

  toData(): SDK.ChunkData {
    return {
      id: this.id,
      name: this.name,
      initial: this.initial,
      size: this.size,
      parsedSize: this._parsedSize || 0,
      entry: this.isEntry(),
      assets: this._assets.map(({ path }) => path),
      modules: this._modules.map(({ id }) => id),
      dependencies: this._dependencies.map(({ id }) => id),
      imported: this._imported.map(({ id }) => id),
    };
  }

  setDependencies(dependencies: SDK.ChunkInstance[]) {
    this._dependencies = dependencies;
  }

  setImported(imported: SDK.ChunkInstance[]) {
    this._imported = imported;
  }

  setModules(modules: SDK.ModuleInstance[]) {
    this._modules = modules;
  }

  setAssets(assets: SDK.AssetInstance[]) {
    this._assets = assets;
  }
}
