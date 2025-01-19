import { SDK } from '@rsdoctor/types';

let id = 1;

export class Dependency implements SDK.DependencyInstance {
  static kind = SDK.DependencyKind;

  static init() {
    id = 1;
  }

  id: number;

  readonly request: string;

  readonly module: SDK.ModuleInstance;

  readonly kind: SDK.DependencyKind;

  readonly statements: SDK.StatementInstance[] = [];

  private _originDependency: SDK.ModuleInstance;

  meta: SDK.DependencyBuildMeta = {
    exportsType: 'default-with-named',
  };

  constructor(
    request: string,
    module: SDK.ModuleInstance,
    dependency: SDK.ModuleInstance,
    kind: SDK.DependencyKind,
    statements?: SDK.StatementInstance[],
  ) {
    this.id = id++;
    this.request = request;
    this.module = module;
    this._originDependency = dependency;
    this.kind = kind;
    this.statements = statements ?? [];
  }

  get resolvedRequest() {
    return this.dependency.path;
  }

  get dependency() {
    return this.originDependency.rootModule ?? this.originDependency;
  }

  get originDependency() {
    return this._originDependency;
  }

  get kindString() {
    return SDK.DependencyKind[this.kind] as keyof typeof SDK.DependencyKind;
  }

  get resolveConcatenationModule() {
    return this.dependency.kind === SDK.ModuleKind.Concatenation;
  }

  isSameWithoutStatements(dep: Dependency) {
    return (
      this.request === dep.request &&
      this.kind === dep.kind &&
      this.module.id === dep.module.id &&
      this.dependency.id === dep.dependency.id
    );
  }

  addStatement(statement: SDK.StatementInstance): void {
    if (!this.hasStatement(statement)) {
      this.statements.push(statement);
    }
  }

  hasStatement(statement: SDK.StatementInstance): boolean {
    return this.statements.some((item) => item.isSame(statement));
  }

  setBuildMeta(data: SDK.DependencyBuildMeta): void {
    this.meta = {
      ...this.meta,
      ...data,
    };
  }

  toData(): SDK.DependencyData {
    return {
      id: this.id,
      request: this.request,
      resolvedRequest: this.resolvedRequest,
      kind: this.kind,
      module: this.module.id,
      dependency: this.dependency.id,
      originDependency: this.originDependency.id,
      statements: this.statements.map((item) => item.toData()),
    };
  }

  setId(id: number): void {
    this.id = id;
  }
}
