import { SDK } from '@rsdoctor/types';
import { ExportInfo } from './export';
import { SideEffect } from './sideEffect';
import { Variable } from './variable';

export class ModuleGraphModule implements SDK.ModuleGraphModuleInstance {
  static init() {
    ExportInfo.init();
    SideEffect.init();
    Variable.init();
  }

  readonly module: SDK.ModuleInstance;

  private exports: SDK.ExportInstance[] = [];

  private sideEffects: SDK.SideEffectInstance[] = [];

  private variables: SDK.VariableInstance[] = [];

  private _dynamic?: boolean;

  private _graph: SDK.ModuleGraphInstance;

  constructor(
    module: SDK.ModuleInstance,
    graph: SDK.ModuleGraphInstance,
    dynamic?: boolean,
  ) {
    this.module = module;
    this._graph = graph;

    if (typeof this._dynamic === 'boolean') {
      this._dynamic = dynamic;
    }
  }

  get dynamic() {
    if (typeof this._dynamic === 'boolean') {
      return this._dynamic;
    }

    return this.module
      .getImported()
      .map((item) => item.getDependencyByModule(this.module))
      .some((item) => item && item.meta.exportsType === 'dynamic');
  }

  addExportInfo(data: SDK.ExportInstance) {
    this.exports.push(data);
    this._graph.addExportInfo(data);
  }

  addSideEffect(data: SDK.SideEffectInstance) {
    this.sideEffects.push(data);
    this._graph.addSideEffect(data);
  }

  addVariable(data: SDK.VariableInstance) {
    this.variables.push(data);
    this._graph.addVariable(data);
  }

  getExports() {
    return this.exports.slice();
  }

  getSideEffects(name?: string) {
    if (name) {
      return this.sideEffects.filter((item) => item.name === name);
    }

    return this.sideEffects.slice();
  }

  getOwnExports() {
    return this.exports.filter((item) => !item.isReExport);
  }

  getExport(name: string) {
    return this.exports.find((item) => item.name === name);
  }

  getReExports() {
    return this.exports.filter((item) => item.isReExport);
  }

  getOwnExport(name: string) {
    return this.getOwnExports().find((item) => item.name === name);
  }

  getReExport(name: string) {
    return this.getReExports().find((item) => item.name === name);
  }

  toData(): SDK.ModuleGraphModuleData {
    return {
      module: this.module.id,
      dynamic: this.dynamic,
      exports: this.exports.map((item) => item.id),
      sideEffects: this.sideEffects.map((item) => item.id),
      variables: this.variables.map((item) => item.id),
    };
  }
}
