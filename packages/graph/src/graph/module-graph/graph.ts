import { SDK } from '@rsdoctor/types';
import { Dependency } from './dependency';
import { Module } from './module';
import { Statement } from './statement';
import {
  ModuleGraphModule,
  ExportInfo,
  SideEffect,
  Variable,
} from './tree-shaking';

export class ModuleGraph implements SDK.ModuleGraphInstance {
  static init() {
    Module.init();
    Dependency.init();
    ModuleGraphModule.init();
  }

  static fromData(data: Partial<SDK.ModuleGraphData>) {
    const moduleGraph = new ModuleGraph();
    const getStatement = (data: SDK.StatementData) =>
      new Statement(moduleGraph.getModuleById(data.module)!, data.position);

    // For creating Module.
    for (const item of data.modules ?? []) {
      const module = new Module(
        String(item.id),
        item.path,
        item.isEntry,
        item.kind,
        item.renderId,
        item.layer,
      );
      (module as any).id = item.id;
      module.setSize(item.size);
      module.meta = {
        strictHarmonyModule: item.meta?.strictHarmonyModule ?? false,
        hasSetEsModuleStatement: item.meta?.hasSetEsModuleStatement ?? false,
      };
      (module as any)._isPreferSource = item.isPreferSource;
      // TODO: chunkGraph need change
      (module as any).chunks = item.chunks;
      moduleGraph.addModule(module);
    }
    // Setting all module relationship information.
    for (const moduleData of data.modules ?? []) {
      const module = moduleGraph.getModuleById(moduleData.id)!;

      for (const depId of moduleData.dependencies) {
        const depData = (data.dependencies ?? []).find(
          (item) => item.id === depId,
        );
        const depModule =
          depData && moduleGraph.getModuleById(depData.originDependency);

        if (!depData || !depModule) {
          console.warn(`The connection data ID is empty: ${depId}`);
          continue;
        }

        const dep = module.addDependency(
          depData.request,
          depModule,
          depData.kind,
          depData.statements.map(getStatement),
        );

        if (!dep) {
          continue;
        }

        (dep as any).id = depData.id;
        moduleGraph.addDependency(dep);
      }

      for (const normalModuleId of moduleData.modules ?? []) {
        const normalModule = moduleGraph.getModuleById(normalModuleId);

        if (!normalModule) {
          console.warn(
            `Add the ordinary module ID as empty: ${normalModuleId}`,
          );
          continue;
        }

        module.addNormalModule(normalModule);
      }

      for (const concatenationModuleId of moduleData.concatenationModules ??
        []) {
        const concatenationModule = moduleGraph.getModuleById(
          concatenationModuleId,
        );

        if (!concatenationModule) {
          console.warn(
            `The aggregation module ID is empty: ${concatenationModule}`,
          );
          continue;
        }

        module.addConcatenationModule(concatenationModule);
      }
    }

    // Create export information.
    for (const exportData of data.exports ?? []) {
      const info = new ExportInfo(
        exportData.name,
        exportData.identifier ? getStatement(exportData.identifier) : undefined,
      );

      (info as any).id = exportData.id;
      moduleGraph.addExportInfo(info);
    }
    // Set the connection relationship of export information.
    for (const exportData of data.exports ?? []) {
      if (exportData.from) {
        const current = moduleGraph._exportIdMap.get(exportData.id);
        const from = moduleGraph._exportIdMap.get(exportData.from);

        if (current && from) {
          current.setFromExport(from);
        }
      }
    }
    // Create variable information.
    for (const varData of data.variables ?? []) {
      const module = moduleGraph.getModuleById(varData.module);

      if (!module) {
        console.warn(
          `The module ID in the variable is empty：${varData.module}`,
        );
        continue;
      }

      const info = new Variable(
        varData.name,
        module,
        varData.usedInfo,
        getStatement(varData.identifier),
      );
      const exportInfo = moduleGraph._exportIdMap.get(varData.exported ?? -1);

      if (exportInfo) {
        info.setExportInfo(exportInfo);
      }

      (info as any).id = varData.id;
      moduleGraph.addVariable(info);
    }
    // Create side effect information.
    for (const sideData of data.sideEffects ?? []) {
      const module = moduleGraph.getModuleById(sideData.module);

      if (!module) {
        console.warn(
          `The module ID in the side effects is empty：${sideData.module}`,
        );
        continue;
      }

      const info = new SideEffect(
        sideData.name,
        module,
        getStatement(sideData.identifier),
        sideData.originName,
      );

      (info as any).isNameSpace = sideData.isNameSpace;
      (info as any).id = sideData.id;

      for (const exportId of sideData.exports ?? []) {
        const exportInfo = moduleGraph._exportIdMap.get(exportId);

        if (exportInfo) {
          exportInfo.addSideEffect(info);
        }
      }

      if (sideData.variable) {
        const varInfo = moduleGraph._varIdMap.get(sideData.variable);

        if (varInfo) {
          (info as any)._variable = varInfo;
        }
      }

      moduleGraph.addSideEffect(info);
    }
    // Create module graph  modules data.
    for (const mgmData of data.moduleGraphModules ?? []) {
      const module = moduleGraph.getModuleById(mgmData.module);

      if (!module) {
        console.warn(
          `The module ID in ModuleGraphModule is empty: ${mgmData.module}`,
        );
        continue;
      }

      const mgm = new ModuleGraphModule(module, moduleGraph, mgmData.dynamic);

      moduleGraph.addModuleGraphModule(mgm);

      mgmData.exports.forEach((id) => {
        const info = moduleGraph._exportIdMap.get(id);
        if (info) {
          mgm.addExportInfo(info);
        }
      });
      mgmData.sideEffects.forEach((id) => {
        const info = moduleGraph._sideEffectIdMap.get(id);
        if (info) {
          mgm.addSideEffect(info);
        }
      });
      mgmData.variables.forEach((id) => {
        const info = moduleGraph._varIdMap.get(id);
        if (info) {
          mgm.addVariable(info);
        }
      });
    }

    // Clear count.
    ModuleGraph.init();

    return moduleGraph;
  }

  private _dependenciesIdMap: Map<number, SDK.DependencyInstance> = new Map();

  private _moduleWebpackIdMap: Map<string, SDK.ModuleInstance> = new Map();

  private _moduleIdMap: Map<number, SDK.ModuleInstance> = new Map();

  private _moduleGraphModules = new Map<
    SDK.ModuleInstance,
    SDK.ModuleGraphModuleInstance
  >();

  private _exportIdMap: Map<number, SDK.ExportInstance> = new Map();

  private _sideEffectIdMap: Map<number, SDK.SideEffectInstance> = new Map();

  private _varIdMap: Map<number, SDK.VariableInstance> = new Map();

  private _layers: Map<string, number> = new Map();

  clear() {
    this._dependenciesIdMap = new Map();
    this._moduleWebpackIdMap = new Map();
    this._moduleIdMap = new Map();
    this._moduleGraphModules = new Map();
    this._exportIdMap = new Map();
    this._sideEffectIdMap = new Map();
    this._varIdMap = new Map();
    this._layers = new Map();
  }

  size() {
    return this._moduleIdMap.size;
  }

  fromInstance(data: ModuleGraph) {
    this._dependenciesIdMap = new Map(data._dependenciesIdMap);
    this._moduleWebpackIdMap = new Map(data._moduleWebpackIdMap);
    this._moduleIdMap = new Map(data._moduleIdMap);
    this._moduleGraphModules = new Map(data._moduleGraphModules);
    this._exportIdMap = new Map(data._exportIdMap);
    this._sideEffectIdMap = new Map(data._sideEffectIdMap);
    this._varIdMap = new Map(data._varIdMap);
    this._layers = new Map(data._layers);
  }

  getSubGraphByModule(module: SDK.ModuleInstance): SDK.ModuleInstance[] {
    const map = new Set<SDK.ModuleInstance>();
    const result: SDK.ModuleInstance[] = [module];

    map.add(module);

    for (let i = 0; i < result.length; i++) {
      const current = result[i];

      for (const { dependency: depModule } of current.getDependencies()) {
        // Has visited, so skipped.
        if (map.has(depModule)) {
          continue;
        }

        map.add(depModule);
        result.push(depModule);
      }
    }

    return result;
  }

  getModules() {
    return Array.from(this._moduleWebpackIdMap.values());
  }

  getDependencies() {
    return Array.from(this._dependenciesIdMap.values());
  }

  getEntryModules() {
    return this.getModules().filter(
      (item) => item.isEntry && item.kind !== SDK.ModuleKind.Concatenation,
    );
  }

  getModuleById(id: number) {
    return this._moduleIdMap.get(id);
  }

  getDependencyById(id: number) {
    return this._dependenciesIdMap.get(id);
  }

  getModuleByWebpackId(id: string) {
    return this._moduleWebpackIdMap.get(id);
  }

  getModuleByFile(file: string) {
    return this.getModules().find((item) => item.path === file);
  }

  addModule(...modules: SDK.ModuleInstance[]) {
    for (const module of modules) {
      if (!this._moduleIdMap.has(module.id)) {
        this._moduleWebpackIdMap.set(module.webpackId, module);
        this._moduleIdMap.set(module.id, module);
        module.layer && this.addLayer(module.layer);
      }
    }
  }

  addDependency(...deps: SDK.DependencyInstance[]) {
    for (const dep of deps) {
      if (!this._dependenciesIdMap.has(dep.id)) {
        this._dependenciesIdMap.set(dep.id, dep);
        this.addModule(dep.module);
        this.addModule(dep.dependency);
      }
    }
  }

  removeModule(module: SDK.ModuleInstance) {
    this._moduleIdMap.delete(module.id);
    this._moduleWebpackIdMap.delete(module.webpackId);

    for (const dep of module.getDependencies()) {
      this.removeDependency(dep);
      this._dependenciesIdMap.delete(dep.id);
    }

    for (const imported of module.getImported()) {
      imported.removeDependencyByModule(imported);
    }
  }

  removeDependency(dep: SDK.DependencyInstance) {
    dep.module.removeDependency(dep);
    dep.dependency.removeImported(dep.module);
    this._dependenciesIdMap.delete(dep.id);
  }

  addModuleGraphModule(mgm: SDK.ModuleGraphModuleInstance) {
    if (!this._moduleGraphModules.has(mgm.module)) {
      this._moduleGraphModules.set(mgm.module, mgm);
    }
  }

  getModuleGraphModule(module: SDK.ModuleInstance) {
    return this._moduleGraphModules.get(module)!;
  }

  getModuleGraphModules() {
    return Array.from(this._moduleGraphModules.values());
  }

  addExportInfo(data: SDK.ExportInstance): void {
    this._exportIdMap.set(data.id, data);
  }

  addSideEffect(data: SDK.SideEffectInstance): void {
    this._sideEffectIdMap.set(data.id, data);
  }

  addVariable(data: SDK.VariableInstance): void {
    this._varIdMap.set(data.id, data);
  }

  addLayer(layer: string) {
    if (!this._layers.get(layer)) {
      this._layers.set(layer, 1);
    }
  }

  getLayers() {
    return this._layers;
  }

  toData(configs?: SDK.ModuleGraphToDataArgs): SDK.ModuleGraphData {
    return {
      dependencies: this.getDependencies().map((item) => item.toData()),
      modules: this.getModules().map((item) =>
        item.toData(configs?.contextPath),
      ),
      moduleGraphModules: Array.from(this._moduleGraphModules.values()).map(
        (item) => item.toData(),
      ),
      exports: Array.from(this._exportIdMap.values()).map((item) =>
        item.toData(),
      ),
      sideEffects: Array.from(this._sideEffectIdMap.values()).map((item) =>
        item.toData(),
      ),
      variables: Array.from(this._varIdMap.values()).map((item) =>
        item.toData(),
      ),
      layers: Array.from(this._layers.keys()),
    };
  }

  toCodeData(type: SDK.ToDataType = SDK.ToDataType.Normal): SDK.ModuleCodeData {
    const codeMap: SDK.ModuleCodeData = {};
    this.getModules().forEach((item) => {
      codeMap[item.id] = item.getSource(type);
    });
    return codeMap;
  }

  setModules(modules: SDK.ModuleInstance[]) {
    this._moduleIdMap = new Map(modules.map((m) => [m.id, m]));
    this._moduleWebpackIdMap = new Map(modules.map((m) => [m.webpackId, m]));
    this._layers = new Map(
      modules.filter((m) => m.layer).map((m) => [m.layer!, 1]),
    );
  }

  setDependencies(dependencies: SDK.DependencyInstance[]) {
    this._dependenciesIdMap = new Map(dependencies.map((d) => [d.id, d]));
  }
}
