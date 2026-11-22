import { Rule, SDK } from '../../types';
import { getChunksByChunkIds, getChunkIdsByAsset } from './chunk';
import {
  getDependenciesByModule,
  getDependencyByPackageData,
} from './dependency';

type ModuleLookup = (id: SDK.ModuleData['id']) => SDK.ModuleData | undefined;

/**
 * Looks up modules by id like `modules.find((m) => m.id === id)`, using an
 * index built on the first lookup. If the list can't be indexed, for example
 * because it isn't an array or has a null entry, it falls back to `find` so
 * errors surface where they did before.
 */
function createModuleLookup(modules: SDK.ModuleData[]): ModuleLookup {
  let lookup: ModuleLookup | undefined;
  return (id) => {
    lookup ??= indexModules(modules);
    return lookup(id);
  };
}

function indexModules(modules: SDK.ModuleData[]): ModuleLookup {
  const find: ModuleLookup = (id) => modules.find((m) => m.id === id);
  const byId = new Map<SDK.ModuleData['id'], SDK.ModuleData>();
  try {
    if (!Array.isArray(modules)) {
      return find;
    }
    // Read by index, in the same order as `find`.
    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];
      const { id } = module;
      // Keep the first module for an id, and skip NaN, which `===` never matches.
      if (!Number.isNaN(id) && !byId.has(id)) {
        byId.set(id, module);
      }
    }
  } catch {
    return find;
  }
  return (id) => byId.get(id);
}

export function getModulesByAsset(
  asset: SDK.AssetData,
  chunks: SDK.ChunkData[],
  modules: SDK.ModuleData[],
  filterModules?: (keyof SDK.ModuleData)[],
  checkModules?: (module: SDK.ModuleData) => boolean,
): SDK.ModuleData[] {
  return createModulesByAssetResolver(
    chunks,
    modules,
    filterModules,
    checkModules,
  )(asset);
}

/**
 * Returns a function that resolves an asset's modules like
 * `getModulesByAsset`, for many assets. `modules` is indexed once, when the
 * resolver is created, so create a new resolver if the list changes.
 */
export function createModulesByAssetResolver(
  chunks: SDK.ChunkData[],
  modules: SDK.ModuleData[],
  filterModules?: (keyof SDK.ModuleData)[],
  checkModules?: (module: SDK.ModuleData) => boolean,
) {
  const findModule = createModuleLookup(modules);
  return (asset: SDK.AssetData): SDK.ModuleData[] => {
    const ids = getChunkIdsByAsset(asset);
    const cks = getChunksByChunkIds(ids, chunks);
    return collectModulesByChunks(cks, findModule, filterModules, checkModules);
  };
}

export function getModuleIdsByChunk(chunk: SDK.ChunkData) {
  const { modules = [] } = chunk;
  return modules;
}

export function getModuleIdsByModulesIds(
  moduleIds: number[],
  modules: SDK.ModuleData[],
) {
  const findModule = createModuleLookup(modules);
  return moduleIds.map((id) => findModule(id)!).filter(Boolean);
}

export function getModulesByChunk(
  chunk: SDK.ChunkData,
  modules: SDK.ModuleData[],
  filterModules?: (keyof SDK.ModuleData)[],
): SDK.ModuleData[] {
  return pickModulesByChunk(chunk, createModuleLookup(modules), filterModules);
}

function pickModulesByChunk(
  chunk: SDK.ChunkData,
  findModule: ModuleLookup,
  filterModules?: (keyof SDK.ModuleData)[],
): SDK.ModuleData[] {
  const ids = getModuleIdsByChunk(chunk);
  return ids
    .map((id) => {
      const module = findModule(id)!;
      if (filterModules && filterModules.length > 0) {
        if (!module) {
          return null as any;
        }
        const filtered: Record<string, any> = {};
        for (const key of filterModules) {
          if (module[key] !== undefined) {
            filtered[key] = module[key];
          }
        }
        return filtered as SDK.ModuleData;
      }
      return module;
    })
    .filter(Boolean);
}

export function getModulesByChunks(
  chunks: SDK.ChunkData[],
  modules: SDK.ModuleData[],
  filterModules?: (keyof SDK.ModuleData)[],
  checkModules?: (module: SDK.ModuleData) => boolean,
): SDK.ModuleData[] {
  return collectModulesByChunks(
    chunks,
    createModuleLookup(modules),
    filterModules,
    checkModules,
  );
}

function collectModulesByChunks(
  chunks: SDK.ChunkData[],
  findModule: ModuleLookup,
  filterModules?: (keyof SDK.ModuleData)[],
  checkModules?: (module: SDK.ModuleData) => boolean,
): SDK.ModuleData[] {
  const res: SDK.ModuleData[] = [];
  const seen = new Set<SDK.ModuleData['id']>();
  try {
    chunks.forEach((chunk) => {
      pickModulesByChunk(chunk, findModule, filterModules).forEach((md) => {
        // `===` never matches NaN, so results with NaN ids are never duplicates.
        if (
          (checkModules ? checkModules(md) : true) &&
          (Number.isNaN(md.id) || !seen.has(md.id))
        ) {
          seen.add(md.id);
          res.push(md);
        }
      });
    });
  } catch {
    // Keep the previous fault-tolerant behavior without depending on core logger.
  }

  return res;
}

export function getModuleByDependency(
  dep: SDK.DependencyData,
  modules: SDK.ModuleData[],
) {
  return modules.find((item) => item.id === dep.module);
}

export function filterModulesAndDependenciesByPackageDeps(
  deps: Rule.DependencyWithPackageData[],
  dependencies: SDK.DependencyData[],
  modules: SDK.ModuleData[],
): Pick<SDK.ModuleGraphData, 'dependencies' | 'modules'> {
  const _dependencies: SDK.DependencyData[] = [];
  const _modules: SDK.ModuleData[] = [];

  for (let i = 0; i < deps.length; i++) {
    const dep = getDependencyByPackageData(deps[i], dependencies);
    if (dep) {
      _dependencies.push(dep);

      const module = getModuleByDependency(dep, modules);
      if (module) {
        _modules.push(module);
      }
    }
  }

  return {
    dependencies: _dependencies,
    modules: _modules,
  };
}

export function getModuleDetails(
  moduleId: number,
  modules: SDK.ModuleData[],
  dependencies: SDK.DependencyData[],
  sideEffectCodes?: SDK.SideEffectCodeData[],
): SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetModuleDetails> {
  const module = modules.find((e) => e.id === moduleId)!;

  return {
    module,
    dependencies: getDependenciesByModule(module, dependencies),
    ...(sideEffectCodes?.length ? { sideEffectCodes } : {}),
  };
}
