import { unionBy } from 'es-toolkit/compat';
import type {
  Compilation,
  Dependency,
  ExternalModule,
  Module,
  ModuleGraph,
  NormalModule,
} from '@rspack/core';
import { SDK } from '@rsdoctor/types';
import { Statement } from '@/graph';

export function isNormalModule(mod: Module): mod is NormalModule {
  return 'request' in mod && 'rawRequest' in mod && 'resource' in mod;
}

export function getBundlerModuleId(mod: Module): string {
  return mod.identifier();
}

export function getBundlerModulePath(mod: NormalModule): string {
  return mod.resource ?? mod.nameForCondition?.() ?? getBundlerModuleId(mod);
}

export function getBundlerDependencyRequest(
  dep: Dependency,
  module?: NormalModule,
): string {
  return (dep as any).request ?? (dep as any).userRequest ?? module?.rawRequest;
}

export function getResolveRequest(dep: Dependency, graph: ModuleGraph) {
  return getBundlerModulePath(graph.getResolvedModule(dep) as NormalModule);
}

export function isExternalModule(mod: Module): mod is ExternalModule {
  return Boolean((mod as any).externalType);
}

export function getModuleSource(mod: NormalModule): string {
  if (isExternalModule(mod)) {
    return '';
  }

  const moduleWithSource = mod as NormalModule & {
    originalSource?: () => {
      source?: () => string | Buffer;
    } | null;
  };

  try {
    return moduleWithSource.originalSource?.()?.source?.()?.toString() ?? '';
  } catch {
    return '';
  }
}

export function getDependencyPosition(
  dep: Dependency,
  module: SDK.ModuleInstance,
  getSource = true,
): SDK.StatementInstance | undefined {
  const { loc: depLoc } = dep;

  if (!depLoc || !('start' in depLoc)) {
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

export function getSdkDependencyByBundlerDependency(
  dep: Dependency,
  module: NormalModule,
  graph: SDK.ModuleGraphInstance,
) {
  const modulePath = getBundlerModulePath(module);
  const request = getBundlerDependencyRequest(dep);
  return graph
    .getDependencies()
    .find(
      (item) => item.module.path === modulePath && item.request === request,
    );
}

export function getAllModules(compilation: Compilation) {
  const modules: NormalModule[] = [];

  for (const mod of compilation.modules) {
    modules.push(...((mod as any).modules ?? []));
    modules.push(mod as NormalModule);
  }

  return unionBy(
    modules.filter(
      (mod) => !getBundlerModuleId(mod).startsWith('webpack/runtime'),
    ),
    (mod) => getBundlerModuleId(mod),
  );
}
