import { SDK, Plugin } from '@rsdoctor/types';
import path from 'path';
import { Lodash } from '@rsdoctor/utils/common';
import type { SourceMapConsumer } from 'source-map';
import type { Program } from 'estree';
import { Dependency } from './dependency';
import { Statement } from './statement';
import { getModuleName } from './utils';

let id = 1;

export class Module implements SDK.ModuleInstance {
  static kind = SDK.ModuleKind;

  public issuerPath: SDK.ModuleInstance['issuerPath'] = [];

  static init() {
    id = 1;
  }

  id: number;

  renderId: string | undefined;

  bailoutReason: string[] = [];

  readonly webpackId: string;

  readonly path: string;

  readonly isEntry: boolean;

  readonly kind: SDK.ModuleKind;

  readonly layer?: string;

  private source: SDK.ModuleSource = {
    source: '',
    transformed: '',
    parsedSource: '',
  };

  private size: SDK.ModuleSize = {
    sourceSize: 0,
    transformedSize: 0,
    parsedSize: 0,
  };

  private sourceMap: SourceMapConsumer | undefined;

  private program: Program | undefined;

  private chunks: SDK.ChunkInstance[] = [];

  private dependencies: SDK.DependencyInstance[] = [];

  private imported: SDK.ModuleInstance[] = [];

  private modules: SDK.ModuleInstance[] = [];

  private concatenationModules: SDK.ModuleInstance[] = [];

  private _isPreferSource?: boolean;

  meta: SDK.ModuleBuildMeta = {
    hasSetEsModuleStatement: false,
    strictHarmonyModule: false,
  };

  constructor(
    webpackId: string,
    path: string,
    isEntry = false,
    kind = SDK.ModuleKind.Normal,
    renderId: string | undefined = undefined,
    layer = '',
  ) {
    this.id = id++;
    this.webpackId = webpackId;
    this.path = path;
    this.isEntry = isEntry;
    this.kind = kind;
    this.renderId = renderId;
    this.layer = layer;
  }

  get rootModule(): SDK.ModuleInstance | undefined {
    return this.modules.find((item) => item.path === this.path);
  }

  get isPreferSource() {
    if (typeof this._isPreferSource === 'boolean') {
      return this._isPreferSource;
    }

    const result =
      this.source.source.length > 0 &&
      this.source.source !== 'test code' &&
      Boolean(this.sourceMap);
    this._isPreferSource = result;
    return result;
  }

  addBailoutReason(reason: string) {
    this.bailoutReason.push(reason);
  }

  getBailoutReason() {
    return this.bailoutReason;
  }

  getChunks(): SDK.ChunkInstance[] {
    return this.chunks.slice();
  }

  addChunk(chunk: SDK.ChunkInstance): void {
    if (!this.chunks.includes(chunk)) {
      this.chunks.push(chunk);
      chunk.addModule(this);
    }
  }

  removeChunk(chunk: SDK.ChunkInstance): void {
    this.chunks = this.chunks.filter((item) => item !== chunk);
  }

  getDependencies(): SDK.DependencyInstance[] {
    return this.dependencies.slice();
  }

  getDependencyByRequest(request: string): SDK.DependencyInstance | undefined {
    return this.dependencies.find((item) => item.request === request);
  }

  getDependencyByModule(
    module: SDK.ModuleInstance,
  ): SDK.DependencyInstance | undefined {
    return this.dependencies.find(
      (item) => item.originDependency === module || item.dependency === module,
    );
  }

  addDependency(
    request: string,
    module: SDK.ModuleInstance,
    kind: SDK.DependencyKind,
    statements?: SDK.StatementInstance[],
  ) {
    const dep = new Dependency(request, this, module, kind, statements);

    if (this.dependencies.every((item) => !item.isSameWithoutStatements(dep))) {
      this.dependencies.push(dep);
      module.addImported(this);

      if (module.rootModule) {
        module.rootModule.addImported(this);
      }

      return dep;
    }
  }

  removeDependency(dep: SDK.DependencyInstance): void {
    this.dependencies = this.dependencies.filter((item) => item === dep);
  }

  removeDependencyByModule(module: SDK.ModuleInstance): void {
    const dep = this.getDependencyByModule(module);
    if (dep) {
      this.removeDependency(dep);
    }
  }

  getImported(): SDK.ModuleInstance[] {
    return this.imported.slice();
  }

  addImported(module: SDK.ModuleInstance): void {
    if (!this.imported.includes(module)) {
      this.imported.push(module);
    }
  }

  removeImported(module: SDK.ModuleInstance): void {
    this.imported = this.imported.filter((item) => item === module);
  }

  setProgram(program: Program) {
    this.program = program;
  }

  getProgram() {
    return this.program;
  }

  setSource(input: Partial<SDK.ModuleSource>): void {
    const { source } = this;
    source.source = input.source ?? source.source;
    source.transformed = input.transformed ?? source.transformed;
    source.parsedSource = input.parsedSource ?? source.parsedSource;
  }

  getSource(type: SDK.ToDataType = SDK.ToDataType.Normal) {
    if (type === SDK.ToDataType.NoCode) {
      return {
        source: '',
        transformed: '',
        parsedSource: '',
      };
    }
    if (
      type === SDK.ToDataType.NoSourceAndAssets ||
      type === SDK.ToDataType.NoSource
    ) {
      return {
        source: '',
        transformed: '',
        parsedSource: this.isPreferSource ? '' : this.source.parsedSource,
      };
    }

    if (type === SDK.ToDataType.All) {
      return {
        source: this.source.source,
        transformed: this.source.transformed,
        parsedSource: this.isPreferSource ? '' : this.source.parsedSource,
      };
    }

    return {
      source: this.source.source,
      transformed: '',
      parsedSource: this.isPreferSource ? '' : this.source.parsedSource,
    };
  }

  setSourceMap(sourceMap: SourceMapConsumer): void {
    this.sourceMap = sourceMap;
  }

  getSourceMap(): SourceMapConsumer | undefined {
    return this.sourceMap;
  }

  setSize(input: Partial<SDK.ModuleSize>): void {
    const { size } = this;
    size.sourceSize = input.sourceSize ?? size.sourceSize;
    size.transformedSize = input.transformedSize ?? size.transformedSize;
    size.parsedSize = input.parsedSize ?? size.parsedSize;
  }

  getSize() {
    return { ...this.size };
  }

  getStatement(transformed: SDK.SourceRange) {
    return new Statement(this, {
      source: this.getSourceRange(transformed),
      transformed: {
        start: { ...transformed.start },
        end: transformed.end ? { ...transformed.end } : undefined,
      },
    });
  }

  getSourceRange(transformed: SDK.SourceRange) {
    const { sourceMap } = this;

    if (!sourceMap) {
      return;
    }

    const source: SDK.SourceRange = {
      start: {},
    };
    const startInSource = sourceMap.originalPositionFor({
      line: transformed.start.line ?? 0,
      column: transformed.start.column ?? 0,
      // The largest lower bound.
      bias: 1,
    });

    if (Lodash.isNumber(startInSource.line)) {
      source.start = {
        line: startInSource.line,
        column: startInSource.column ?? undefined,
      };
    }

    if (transformed.end) {
      const endInSource = sourceMap.originalPositionFor({
        line: transformed.end.line ?? 0,
        column: transformed.end.column ?? 0,
        // The smallest lower bound
        // bias: 2,
      });

      if (Lodash.isNumber(endInSource.line)) {
        source.end = {
          line: endInSource.line,
          column: endInSource.column ?? undefined,
        };
      }
    }

    return source;
  }

  addNormalModule(module: SDK.ModuleInstance): void {
    if (!this.modules.includes(module)) {
      this.modules.push(module);
      module.addConcatenationModule(this);
    }
  }

  getNormalModules() {
    return this.modules.slice();
  }

  addConcatenationModule(module: SDK.ModuleInstance): void {
    if (!this.concatenationModules.includes(module)) {
      this.concatenationModules.push(module);
    }
  }

  addIssuerPath(issuerPath: Plugin.StatsModule['issuerPath']): void {
    if (!this.issuerPath?.length) {
      this.issuerPath = issuerPath;
    }
  }

  getIssuerPath(): Plugin.StatsModule['issuerPath'] {
    return this.issuerPath;
  }

  getConcatenationModules(): SDK.ModuleInstance[] {
    return this.concatenationModules.slice();
  }

  toData(contextPath?: string): SDK.ModuleData {
    const { isPreferSource } = this;
    const moduleName = getModuleName(this.webpackId);
    const data: SDK.ModuleData = {
      id: this.id,
      renderId: this.renderId,
      webpackId:
        contextPath && moduleName.indexOf('.') > 0
          ? path.relative(contextPath, moduleName)
          : this.webpackId,
      path: this.path,
      isPreferSource,
      dependencies: this.dependencies.map((item) => item.id),
      imported: this.imported.map((item) => item.id),
      chunks: this.chunks.map((item) => item.id),
      size: this.getSize(),
      kind: this.kind,
      ...(this.layer ? { layer: this.layer } : {}),
      issuerPath:
        this.issuerPath
          ?.filter((issuer) => issuer.moduleId)
          .map((issuer) => issuer.moduleId) || [],
      bailoutReason: this.bailoutReason,
    };

    if (this.meta.hasSetEsModuleStatement || this.meta.strictHarmonyModule) {
      data.meta = {};

      if (this.meta.hasSetEsModuleStatement) {
        data.meta.hasSetEsModuleStatement = true;
      }

      if (this.meta.strictHarmonyModule) {
        data.meta.strictHarmonyModule = true;
      }
    }

    if (this.isEntry) {
      data.isEntry = this.isEntry;
    }

    if (this.modules.length > 0) {
      data.modules = this.modules.map((item) => item.id);
    }

    if (this.rootModule) {
      data.rootModule = this.rootModule.id;
    }

    if (this.concatenationModules.length > 0) {
      data.concatenationModules = this.concatenationModules.map(
        (data) => data.id,
      );
    }

    return data;
  }

  setId(id: number) {
    this.id = id;
  }

  setRenderId(renderId: string) {
    this.renderId = renderId;
  }

  setChunks(chunks: SDK.ChunkInstance[]): void {
    this.chunks = chunks;
  }

  setDependencies(dependencies: SDK.DependencyInstance[]): void {
    this.dependencies = dependencies;
  }

  setImported(imported: SDK.ModuleInstance[]): void {
    this.imported = imported;
  }

  setModules(modules: SDK.ModuleInstance[]): void {
    this.modules = modules;
  }

  setConcatenationModules(modules: SDK.ModuleInstance[]): void {
    this.concatenationModules = modules;
  }
}
