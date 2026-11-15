import { Rule, SDK } from '../../types';
import { getChunksByChunkIds, getChunkIdsByAsset } from './chunk';
import {
  getDependenciesByModule,
  getDependencyByPackageData,
} from './dependency';

type ModuleIndex = Map<SDK.ModuleData['id'], SDK.ModuleData>;

// Keeps the first module for each id, as `find` does.
function indexModulesById(modules: SDK.ModuleData[]): ModuleIndex {
  const byId: ModuleIndex = new Map();
  for (const module of modules) {
    if (!byId.has(module.id)) {
      byId.set(module.id, module);
    }
  }
  return byId;
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
  const byId = indexModulesById(modules);
  return (asset: SDK.AssetData): SDK.ModuleData[] => {
    const ids = getChunkIdsByAsset(asset);
    const cks = getChunksByChunkIds(ids, chunks);
    return collectModulesByChunks(cks, byId, filterModules, checkModules);
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
  const byId = indexModulesById(modules);
  return moduleIds.map((id) => byId.get(id)!).filter(Boolean);
}

export function getModulesByChunk(
  chunk: SDK.ChunkData,
  modules: SDK.ModuleData[],
  filterModules?: (keyof SDK.ModuleData)[],
): SDK.ModuleData[] {
  return pickModulesByChunk(chunk, indexModulesById(modules), filterModules);
}

function pickModulesByChunk(
  chunk: SDK.ChunkData,
  byId: ModuleIndex,
  filterModules?: (keyof SDK.ModuleData)[],
): SDK.ModuleData[] {
  const ids = getModuleIdsByChunk(chunk);
  return ids
    .map((id) => {
      const module = byId.get(id)!;
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
    indexModulesById(modules),
    filterModules,
    checkModules,
  );
}

function collectModulesByChunks(
  chunks: SDK.ChunkData[],
  byId: ModuleIndex,
  filterModules?: (keyof SDK.ModuleData)[],
  checkModules?: (module: SDK.ModuleData) => boolean,
): SDK.ModuleData[] {
  const res: SDK.ModuleData[] = [];
  const seen = new Set<SDK.ModuleData['id']>();
  try {
    chunks.forEach((chunk) => {
      pickModulesByChunk(chunk, byId, filterModules).forEach((md) => {
        if ((checkModules ? checkModules(md) : true) && !seen.has(md.id)) {
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
