import { unionBy } from 'lodash';
import { Statement } from '@rsdoctor/graph';
import {
  Compilation,
  Dependency,
  ExternalModule,
  Module,
  ModuleGraph,
  NormalModule,
} from 'webpack';
import type { EntryPoint, ExportInfo } from '@/types/index';
import { SDK } from '@rsdoctor/types';

export function isNormalModule(mod: Module): mod is NormalModule {
  return 'request' in mod && 'rawRequest' in mod && 'resource' in mod;
}

export function getWebpackModuleId(mod: Module): string {
  return mod.identifier();
}

export function getWebpackModulePath(mod: NormalModule): string {
  return mod.resource ?? mod.nameForCondition?.() ?? getWebpackModuleId(mod);
}

export function getWebpackDependencyRequest(
  dep: Dependency,
  module?: NormalModule,
): string {
  return (dep as any).request ?? (dep as any).userRequest ?? module?.rawRequest;
}

export function getResolveRequest(dep: Dependency, graph: ModuleGraph) {
  return getWebpackModulePath(graph.getResolvedModule(dep) as NormalModule);
}

export function isExternalModule(mod: Module): mod is ExternalModule {
  return Boolean((mod as any).externalType);
}

export function getModuleSource(mod: NormalModule): string {
  return isExternalModule(mod)
    ? ''
    : (mod.originalSource?.()?.source().toString() ?? '');
}

export function getEntryModule(
  entryMap: Map<string, EntryPoint>,
): NormalModule[] {
  return Array.from(entryMap.values())
    .map((entry) => entry.getRuntimeChunk())
    .map((chunk) => (chunk ? chunk.entryModule : null))
    .filter(Boolean)
    .map((mod) => (isNormalModule(mod!) ? mod : (mod as any).rootModule));
}

export function getDependencyPosition(
  dep: Dependency,
  module: SDK.ModuleInstance,
  getSource = true,
): SDK.StatementInstance | undefined {
  const { loc: depLoc } = dep;

  if (!('start' in depLoc)) {
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

export function getExportDependency(info: ExportInfo, module: NormalModule) {
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
  dep: Dependency,
  module: NormalModule,
  graph: SDK.ModuleGraphInstance,
) {
  const modulePath = getWebpackModulePath(module);
  const request = getWebpackDependencyRequest(dep);
  return graph
    .getDependencies()
    .find(
      (item) => item.module.path === modulePath && item.request === request,
    );
}

export function getExportStatement(
  info: ExportInfo,
  normalModule: NormalModule,
  graph: SDK.ModuleGraphInstance,
) {
  const webpackDependency = getExportDependency(info, normalModule);

  if (!webpackDependency) {
    return;
  }

  const modulePath = getWebpackModulePath(normalModule);
  const request = getWebpackDependencyRequest(webpackDependency);
  const sdkDependency = graph
    .getDependencies()
    .find(
      (item) => item.module.path === modulePath && item.request === request,
    );

  if (sdkDependency && sdkDependency.statements.length === 1) {
    return sdkDependency.statements[0];
  }

  // TODO: When there are multiple statements, the transform position can be matched, and there is no need to calculate it again.
  const sdkModule = graph.getModuleByWebpackId(
    getWebpackModuleId(normalModule),
  );

  if (sdkModule) {
    return getDependencyPosition(webpackDependency, sdkModule);
  }
}

export function getLastExportInfo(
  info: ExportInfo,
  webpackGraph: ModuleGraph,
): ExportInfo | undefined {
  const target = info.findTarget(webpackGraph, () => true);

  if (!target || !target.export) {
    return;
  }

  const exportsInfo = webpackGraph.getExportsInfo(target.module);
  const lastInfo = exportsInfo.getExportInfo(target.export[0]);

  return lastInfo;
}

export function getAllModules(compilation: Compilation) {
  const modules: NormalModule[] = [];

  for (const mod of compilation.modules) {
    modules.push(...((mod as any).modules ?? []));
    modules.push(mod as NormalModule);
  }

  return unionBy(
    modules.filter(
      (mod) => !getWebpackModuleId(mod).startsWith('webpack/runtime'),
    ),
    (mod) => getWebpackModuleId(mod),
  );
}
