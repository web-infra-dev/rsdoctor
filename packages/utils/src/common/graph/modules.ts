import { Rule, SDK } from '@rsdoctor/types';
import { getChunksByChunkIds, getChunkIdsByAsset } from './chunk';
import {
  getDependenciesByModule,
  getDependencyByPackageData,
} from './dependency';
import { logger } from 'src/logger';
import { isStyleExt, isJsExt } from '../file';

export function getModulesByAsset(
  asset: SDK.AssetData,
  chunks: SDK.ChunkData[],
  modules: SDK.ModuleData[],
  filterModules?: (keyof SDK.ModuleData)[],
  checkModules?: (module: SDK.ModuleData) => boolean,
): SDK.ModuleData[] {
  const ids = getChunkIdsByAsset(asset);
  const cks = getChunksByChunkIds(ids, chunks);
  const res = getModulesByChunks(
    asset.path,
    cks,
    modules,
    filterModules,
    checkModules,
  );
  return res;
}

export function getModuleIdsByChunk(chunk: SDK.ChunkData) {
  const { modules = [] } = chunk;
  return modules;
}

export function getModuleIdsByModulesIds(
  moduleIds: number[],
  modules: SDK.ModuleData[],
) {
  return moduleIds
    .map((id) => modules.find((m) => m.id === id)!)
    .filter(Boolean);
}

export function getModulesByChunk(
  chunk: SDK.ChunkData,
  modules: SDK.ModuleData[],
  filterModules?: (keyof SDK.ModuleData)[],
): SDK.ModuleData[] {
  const ids = getModuleIdsByChunk(chunk);
  return ids
    .map((id) => {
      const module = modules.find((e) => e.id === id)!;
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

function getTypeChecker(assetPath: string) {
  if (isStyleExt(assetPath)) return isStyleExt;
  if (isJsExt(assetPath)) return isJsExt;
  return () => true;
}

export function getModulesByChunks(
  assetPath: string,
  chunks: SDK.ChunkData[],
  modules: SDK.ModuleData[],
  filterModules?: (keyof SDK.ModuleData)[],
  checkModules?: (module: SDK.ModuleData) => boolean,
): SDK.ModuleData[] {
  const res: SDK.ModuleData[] = [];

  const typeChecker = getTypeChecker(assetPath);

  try {
    chunks.forEach((chunk) => {
      getModulesByChunk(chunk, modules, filterModules).forEach((md) => {
        const name = md.path || '';
        if (!typeChecker(name)) return;

        if (
          !res.filter((_m) => _m.id === md.id).length &&
          checkModules &&
          checkModules(md)
        )
          res.push(md);
      });
    });
  } catch (error) {
    logger.debug(error);
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
): SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetModuleDetails> {
  const module = modules.find((e) => e.id === moduleId)!;

  return {
    module,
    dependencies: getDependenciesByModule(module, dependencies),
  };
}
