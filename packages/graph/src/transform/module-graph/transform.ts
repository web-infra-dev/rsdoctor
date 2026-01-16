import { SDK, Plugin } from '@rsdoctor/types';
import path from 'path-browserify';
import { Statement, ModuleGraph, Module } from '@/graph';
import { isImportDependency, getImportKind } from './utils';
import { getPositionByStatsLocation } from './compatible';

function getCanSkip(data: Plugin.StatsModule) {
  if (
    !data.identifier ||
    !(data?.nameForCondition || data.name) ||
    data.identifier.startsWith('webpack/runtime') ||
    data?.name?.startsWith('(webpack)')
  ) {
    return true;
  }
}

function getGetModuleName(root: string, data: Plugin.StatsModule) {
  if (data.nameForCondition) {
    return data.nameForCondition!.replace('\x00', '');
  }
  const name = data.name!.replace(/ ?\+ ?\d+ ?modules$/, '');
  return path.isAbsolute(name) ? name : path.join(root, name);
}

function isJsonFile(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.json';
}

function getModuleFromChildren(
  module: Plugin.StatsModule,
  collectedModules: Plugin.StatsModule[],
) {
  if (module.type === 'module' || typeof module.type === 'undefined') {
    collectedModules.push(module);
  } else if ('children' in module && module.children) {
    getModulesFromArray(
      module.children as Plugin.StatsModule[],
      collectedModules,
    );
  }
}

export function getModulesFromArray(
  modules: Plugin.StatsModule[],
  collectedModules: Plugin.StatsModule[],
) {
  modules.forEach((module) => {
    getModuleFromChildren(module, collectedModules);
  });
}

function getModulesFromChunks(
  chunks: Plugin.StatsCompilation['chunks'],
  collectedModules: Plugin.StatsModule[],
) {
  chunks?.forEach((chunk) => {
    if (chunk.modules?.length) {
      collectedModules.push(
        ...chunk.modules.map((module) => ({
          ...module,
          identifier: module.identifier ?? module.moduleIdentifier,
          name: module.name ?? module.moduleName,
        })),
      );
    }
  });
}

/**
 * this function can run in browser & node.
 */
export function getModuleGraphByStats(
  { modules, chunks }: Plugin.StatsCompilation,
  root: string,
  chunkGraph: SDK.ChunkGraphInstance,
) {
  ModuleGraph.init();

  const moduleGraph = new ModuleGraph();
  const allModules: Plugin.StatsModule[] = [];
  const collectedModules: Plugin.StatsModule[] = [];

  getModulesFromArray(modules ?? [], collectedModules);
  getModulesFromChunks(chunks ?? [], collectedModules);

  // Conversion modules
  for (const data of collectedModules ?? []) {
    if (getCanSkip(data)) {
      continue;
    }

    const existingModule = moduleGraph.getModuleByWebpackId(data.identifier!);
    let concatenatedModule: SDK.ModuleInstance;

    if (existingModule) {
      concatenatedModule = existingModule;
    } else {
      allModules.push(data);

      const isConcatenated = Boolean(data.modules && data.modules.length > 0);
      concatenatedModule = new Module(
        data.identifier ?? data.moduleIdentifier!,
        getGetModuleName(root, data),
        data.depth === 0,
        isConcatenated ? SDK.ModuleKind.Concatenation : SDK.ModuleKind.Normal,
        data.id ? String(data.id) : undefined,
        data.layer!,
      );

      if (data.issuerPath) {
        concatenatedModule.addIssuerPath(data.issuerPath);
      }

      data.chunks?.forEach((_chunkId) => {
        const chunk = chunkGraph.getChunkById(String(_chunkId));
        chunk && concatenatedModule.addChunk(chunk);
      });

      moduleGraph.addModule(concatenatedModule);

      if (data.source) {
        concatenatedModule.setSource({
          transformed: Buffer.isBuffer(data.source)
            ? data.source.toString()
            : data.source,
        });
      }

      if (typeof data.size === 'number') {
        concatenatedModule.setSize({
          sourceSize: data.size,
          transformedSize: data.size,
        });
        const sizeData: Partial<SDK.ModuleSize> = {
          sourceSize: data.size,
          transformedSize: data.size,
        };
        if (isJsonFile(concatenatedModule.path)) {
          sizeData.parsedSize = data.size;
        }
        concatenatedModule.setSize(sizeData);
      }
    }

    // Always add bailoutReason if present, even if module already exists
    if (data.optimizationBailout) {
      data.optimizationBailout
        .filter((reason) => !reason.includes('ModuleConcatenation bailout'))
        .forEach((reason) => concatenatedModule.addBailoutReason(reason));
    }

    for (const normal of data.modules ?? []) {
      if (getCanSkip(normal)) {
        continue;
      }

      allModules.push(normal);

      const webpackId = normal.identifier!;
      const registeredModule = moduleGraph.getModuleByWebpackId(webpackId);
      let normalModule: SDK.ModuleInstance;

      if (registeredModule) {
        normalModule = registeredModule;
      } else {
        normalModule =
          moduleGraph.getModuleByWebpackId(webpackId) ??
          new Module(
            webpackId,
            getGetModuleName(root, normal),
            normal.depth === 0,
            SDK.ModuleKind.Normal,
            normal.id ? String(normal.id) : undefined,
            normal.layer,
          );
      }

      if (normal.optimizationBailout) {
        normal.optimizationBailout
          .filter((reason) => !reason.includes('ModuleConcatenation bailout'))
          .forEach((reason) => normalModule.addBailoutReason(reason));
      }

      if (normal.issuerPath) {
        normalModule.addIssuerPath(normal.issuerPath);
      }

      if (normal.chunks?.length) {
        normal.chunks?.forEach((_chunkId) => {
          const chunk = chunkGraph.getChunkById(String(_chunkId));
          chunk && normalModule.addChunk(chunk);
        });
      } else {
        data.chunks?.forEach((_chunkId) => {
          const chunk = chunkGraph.getChunkById(String(_chunkId));
          chunk && normalModule.addChunk(chunk);
        });
      }
      if (normal.source) {
        normalModule.setSource({
          transformed: Buffer.isBuffer(normal.source)
            ? normal.source.toString()
            : normal.source,
        });
      }

      if (typeof normal.size === 'number') {
        normalModule.setSize({
          sourceSize: normal.size,
          transformedSize: normal.size,
        });
        const sizeData: Partial<SDK.ModuleSize> = {
          sourceSize: normal.size,
          transformedSize: normal.size,
        };
        // Since JSON modules do not generate sourcemaps, the parsedSize for JSON modules can only be added from the stats JSON.
        if (isJsonFile(normalModule.path)) {
          sizeData.parsedSize = normal.size;
        }
        normalModule.setSize(sizeData);
      }

      moduleGraph.addModule(normalModule);
      concatenatedModule.addNormalModule(normalModule);
    }
  }

  // Conversion dependency
  for (const module of allModules) {
    const currentModule = moduleGraph.getModuleByWebpackId(
      module.identifier ?? '',
    );

    if (!currentModule) {
      continue;
    }

    const dependencies = (module.reasons ?? [])
      .filter(isImportDependency)
      .filter((item) => Boolean(item.moduleIdentifier && item.userRequest));

    // webpack@5.x has type === 'from origin' https://github.com/webpack/webpack/blob/HEAD/lib/stats/DefaultStatsFactoryPlugin.js#L2220
    (module.reasons ?? [])
      .filter((item) => item.type === 'from origin')
      .forEach((dep) =>
        dep?.children?.forEach((_d: Plugin.StatsModuleReason) =>
          dependencies.push({ ...dep, ..._d, children: undefined }),
        ),
      );

    for (const dep of dependencies) {
      const rawRequest = dep.userRequest!;
      const requestModule = moduleGraph.getModuleByWebpackId(
        dep.moduleIdentifier!,
      );

      if (!requestModule) {
        continue;
      }

      // When there is no record dependency, you need to record the dependency first.
      if (!requestModule.getDependencyByRequest(rawRequest)) {
        const data = requestModule.addDependency(
          rawRequest,
          currentModule,
          getImportKind(dep),
        );

        if (data) {
          moduleGraph.addDependency(data);
        }
      }

      const dependency = requestModule.getDependencyByRequest(rawRequest);

      if (dependency && dep?.loc) {
        const position = getPositionByStatsLocation(dep.loc);

        if (position) {
          dependency.addStatement(
            new Statement(requestModule, {
              transformed: position,
            }),
          );
        }
      }
    }
  }

  const moduleCache = new Map<string, SDK.ModuleInstance>();

  moduleGraph.getModules().forEach((module) => {
    if (module.issuerPath) {
      module.issuerPath.forEach((issuer) => {
        let moduleInstance = moduleCache.get(issuer.identifier);
        if (!moduleInstance) {
          moduleInstance = moduleGraph.getModuleByWebpackId(issuer.identifier);
          if (moduleInstance) {
            moduleCache.set(issuer.identifier, moduleInstance);
          }
        }
        if (moduleInstance) {
          issuer.moduleId = moduleInstance.id;
        }
      });
    }
  });

  return moduleGraph;
}
