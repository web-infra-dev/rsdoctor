import { unionBy } from 'lodash';
import { Statement } from '@rsdoctor/graph';
import { Compilation, ExternalModule, Module } from 'webpack';

import type {
  EntryPoint,
  ExportInfo,
  IDependency,
  IModuleGraph,
  INormalModule,
} from '@/types/index';
import { SDK } from '@rsdoctor/types';

export function isNormalModule(mod: Module): mod is INormalModule {
  return 'request' in mod && 'rawRequest' in mod && 'resource' in mod;
}

export function getModuleId(mod: Plugins.StatsModule): string {
  return mod.identifier();
}

export function getModulePath(mod: INormalModule): string {
  return mod.resource ?? mod.nameForCondition?.() ?? getModuleId(mod);
}

export function getDependencyRequest(
  dep: IDependency,
  module?: INormalModule,
): string {
  return (dep as any).request ?? (dep as any).userRequest ?? module?.rawRequest;
}

export function getResolveRequest(dep: IDependency, graph: IModuleGraph) {
  return getModulePath(
    graph.getResolvedModule(dep as IDependency) as INormalModule,
  );
}

export function isExternalModule(mod: Module): mod is ExternalModule {
  return Boolean((mod as any).externalType);
}

export function getModuleSource(mod: INormalModule): string {
  return isExternalModule(mod)
    ? ''
    : (mod.originalSource?.()?.source().toString() ?? '');
}

export function getEntryModule(
  entryMap: Map<string, EntryPoint>,
): INormalModule[] {
  return Array.from(entryMap.values())
    .map((entry) => entry.getRuntimeChunk())
    .map((chunk) => (chunk ? chunk.entryModule : null))
    .filter(Boolean)
    .map((mod) => (isNormalModule(mod!) ? mod : (mod as any).rootModule));
}

export function getDependencyPosition(
  dep: IDependency,
  module: SDK.ModuleInstance,
  getSource = true,
): SDK.StatementInstance | undefined {
  const { loc: depLoc } = dep;

  if (depLoc === undefined || !('start' in depLoc)) {
    return;
  }

  const transformed = {
    start: {
      line: depLoc.start.line,
      column: depLoc.start.column,
    },
    end: depLoc.end
      ? {
          line: depLoc.end.line,
          column: depLoc.end.column,
        }
      : undefined,
  };
  const statement = new Statement(module, {
    source: getSource ? module.getSourceRange(transformed) : undefined,
    transformed,
  });

  return statement;
}

export function getExportDependency(info: ExportInfo, module: INormalModule) {
  let dep = module.dependencies.find((dep) => {
    // TODO: type
    return (
      (dep as any).name === info.name &&
      (dep.type === 'harmony export imported specifier' ||
        dep.type === 'harmony export specifier')
    );
  });

  if (!dep && (info as any)._target && (info as any)._target.size > 0) {
    dep = (info as any)._getMaxTarget().values().next().value
      .connection.dependency;
  }

  return dep;
}

export function getSdkDependencyByWebpackDependency(
  dep: IDependency,
  module: INormalModule,
  graph: SDK.ModuleGraphInstance,
) {
  const modulePath = getWebpackModulePath(module);
  const request = getDependencyRequest(dep);
  return graph
    .getDependencies()
    .find(
      (item) => item.module.path === modulePath && item.request === request,
    );
}

export function getExportStatement(
  info: ExportInfo,
  normalModule: INormalModule,
  graph: SDK.ModuleGraphInstance,
) {
  const webpackDependency = getExportDependency(info, normalModule);

  if (!webpackDependency) {
    return;
  }

  const modulePath = getModulePath(normalModule);
  const request = getDependencyRequest(webpackDependency);
  const sdkDependency = graph
    .getDependencies()
    .find(
      (item) => item.module.path === modulePath && item.request === request,
    );

  if (sdkDependency && sdkDependency.statements.length === 1) {
    return sdkDependency.statements[0];
  }

  // TODO: When there are multiple statements, the transform position can be matched, and there is no need to calculate it again.
  const sdkModule = graph.getModuleByWebpackId(getModuleId(normalModule));

  if (sdkModule) {
    return getDependencyPosition(webpackDependency, sdkModule);
  }
}

export function getLastExportInfo(
  info: ExportInfo,
  graph: IModuleGraph,
): ExportInfo | undefined {
  const target = 'findTarget' in info && info.findTarget(graph, () => true);

  if (!target || !target.export) {
    return;
  }

  const exportsInfo = graph.getExportsInfo(target.module);
  const lastInfo =
    'getExportInfo' in exportsInfo
      ? exportsInfo.getExportInfo(target.export[0])
      : undefined;

  return lastInfo;
}

export function getAllModules(compilation: Compilation) {
  const modules: INormalModule[] = [];

  for (const mod of compilation.modules) {
    modules.push(...((mod as any).modules ?? []));
    modules.push(mod as INormalModule);
  }

  return unionBy(
    modules.filter((mod) => !getModuleId(mod).startsWith('webpack/runtime')),
    (mod) => getModuleId(mod),
  );
}
