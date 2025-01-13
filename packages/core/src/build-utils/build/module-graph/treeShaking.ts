import {
  ExportInfo,
  Variable,
  SideEffect,
  ModuleGraphModule,
  Statement,
} from '@rsdoctor/graph';
import type { SDK, Plugin } from '@rsdoctor/types';
import type {
  NormalModule as WebpackNormalModule,
  ModuleGraph as WebpackModuleGraph,
  Compilation,
} from 'webpack';

import type {
  HarmonyImportSpecifierDependency,
  ExportInfo as WebExportInfo,
} from '@/types';
import {
  getAllModules,
  getLastExportInfo,
} from '@/build-utils/common/webpack/compatible';
import {
  getDeclarationIdentifier,
  getExportIdentifierStatement,
} from './utils';
import { isWebpack5orRspack } from '@/build-utils/common/module-graph';

type ExportData = Map<WebExportInfo, SDK.ExportInstance>;

function transformMgm(
  origin: WebpackNormalModule,
  webpackGraph: WebpackModuleGraph,
  graph: SDK.ModuleGraphInstance,
  cache: ExportData,
) {
  const module = graph.getModuleByWebpackId(origin.identifier());

  if (!module) {
    return;
  }

  const mgm = new ModuleGraphModule(module, graph);
  const originalMgm = webpackGraph.getExportsInfo(origin);

  graph.addModuleGraphModule(mgm);

  for (const info of originalMgm.exports) {
    const { name } = info;
    const exportIdStatement =
      getExportIdentifierStatement(name, module) ??
      Statement.getDefaultStatement(module);
    const declareIdStatement = getDeclarationIdentifier(name, module);
    const exportInfo = new ExportInfo(info.name, exportIdStatement);

    if (declareIdStatement) {
      const variable = new Variable(
        name,
        module,
        info.getUsedInfo(),
        declareIdStatement,
      );
      variable.setExportInfo(exportInfo);
      mgm.addVariable(variable);
    }

    cache.set(info, exportInfo);
    mgm.addExportInfo(exportInfo);
  }

  // Set sideEffect information
  for (const dep of origin.dependencies) {
    // TODO: CJS type to be supplemented, local side effects to be supplemented.
    if (dep.type !== 'harmony import specifier') {
      continue;
    }

    const HISDep = dep as HarmonyImportSpecifierDependency;
    const { name, userRequest } = HISDep;
    const originName =
      HISDep.getIds(webpackGraph)[0] ?? SideEffect.NamespaceSymbol;
    const importIdStatement = module.getStatement(dep.loc as SDK.SourceRange)!;
    const importInfo = new SideEffect(
      name,
      module,
      importIdStatement,
      userRequest,
      originName,
    );

    mgm.addSideEffect(importInfo);
  }
}

function appendExportConnection(
  origin: WebpackNormalModule,
  webpackGraph: WebpackModuleGraph,
  graph: SDK.ModuleGraphInstance,
  cache: ExportData,
) {
  const module = graph.getModuleByWebpackId(origin.identifier());
  const mgm = graph.getModuleGraphModule(module!);
  const originalMgm = webpackGraph.getExportsInfo(origin);

  if (!mgm || !module) {
    return;
  }

  // Set export information association.
  for (const info of originalMgm.exports) {
    if (!info.isReexport()) {
      continue;
    }

    const lastExport = getLastExportInfo(info, webpackGraph);
    const lastSdkExport = cache.get(lastExport!);
    const sdkExport = cache.get(info);

    if (!lastSdkExport || !sdkExport) {
      return;
    }

    sdkExport.setFromExport(lastSdkExport);
  }
}

function appendImportConnection(
  origin: WebpackNormalModule,
  graph: SDK.ModuleGraphInstance,
) {
  const module = graph.getModuleByWebpackId(origin.identifier());
  const mgm = graph.getModuleGraphModule(module!);

  if (!mgm || !module) {
    return;
  }

  // Set the information association of sideEffect and other file exports.
  for (const info of mgm.getSideEffects()) {
    const exportName = info.originName ?? info.name;
    const resolveModule = info.fromDependency?.dependency;

    if (!resolveModule) {
      continue;
    }

    const resolveExport = graph
      .getModuleGraphModule(resolveModule)
      .getExport(exportName);

    if (resolveExport) {
      info.setExportInfo(resolveExport);
    }
  }

  // TODO: Set sideEffect's information association in local file export.
}

export function appendTreeShaking(
  moduleGraph: SDK.ModuleGraphInstance,
  compilation: Plugin.BaseCompilation,
) {
  if (!isWebpack5orRspack(compilation)) {
    return moduleGraph;
  }

  if ('moduleGraph' in compilation) {
    const exportData = new Map<WebExportInfo, SDK.ExportInstance>();
    const webpackCompilation = compilation as unknown as Compilation;
    const { moduleGraph: webpackGraph } = webpackCompilation;
    const allModules = getAllModules(webpackCompilation);

    allModules.forEach((origin) =>
      transformMgm(origin, webpackGraph, moduleGraph, exportData),
    );
    allModules.forEach((origin) =>
      appendExportConnection(origin, webpackGraph, moduleGraph, exportData),
    );
    allModules.forEach((origin) => appendImportConnection(origin, moduleGraph));
    exportData.clear();

    return moduleGraph;
  }

  return moduleGraph;
}
