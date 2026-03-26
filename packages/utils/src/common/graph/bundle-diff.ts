import { Client, SDK } from '@rsdoctor/types';
import { getAssetsDiffResult, diffSize } from './assets';

/**
 * Compute module diff between baseline and current.
 * Modules are matched by their file path.
 */
export function getModulesDiffResult(
  baseline: SDK.ModuleGraphData,
  current: SDK.ModuleGraphData,
): Client.RsdoctorClientModulesDiffResult {
  const baselineMap = new Map<string, SDK.ModuleData>();
  for (const m of baseline.modules) {
    baselineMap.set(m.path, m);
  }

  const currentMap = new Map<string, SDK.ModuleData>();
  for (const m of current.modules) {
    currentMap.set(m.path, m);
  }

  const added: Client.RsdoctorClientModulesDiffResult['added'] = [];
  const removed: Client.RsdoctorClientModulesDiffResult['removed'] = [];
  const changed: Client.RsdoctorClientModuleDiffItem[] = [];

  for (const [path, bModule] of baselineMap) {
    const cModule = currentMap.get(path);
    if (!cModule) {
      removed.push({ path, size: bModule.size });
    } else if (bModule.size.parsedSize !== cModule.size.parsedSize) {
      const { percent, state } = diffSize(
        bModule.size.parsedSize,
        cModule.size.parsedSize,
      );
      changed.push({
        path,
        size: { baseline: bModule.size, current: cModule.size },
        percent,
        state,
      });
    }
  }

  for (const [path, cModule] of currentMap) {
    if (!baselineMap.has(path)) {
      added.push({ path, size: cModule.size });
    }
  }

  added.sort((a, b) => a.path.localeCompare(b.path));
  removed.sort((a, b) => a.path.localeCompare(b.path));
  changed.sort((a, b) => a.path.localeCompare(b.path));
  return { added, removed, changed };
}

/**
 * Compute package diff between baseline and current.
 * Packages are matched by name@version.
 */
export function getPackagesDiffResult(
  baseline: SDK.PackageGraphData,
  current: SDK.PackageGraphData,
): Client.RsdoctorClientPackagesDiffResult {
  const toKey = (p: SDK.PackageData) => `${p.name}@${p.version}`;

  const baselineMap = new Map<string, SDK.PackageData>();
  for (const p of baseline.packages) {
    baselineMap.set(toKey(p), p);
  }

  const currentMap = new Map<string, SDK.PackageData>();
  for (const p of current.packages) {
    currentMap.set(toKey(p), p);
  }

  const added: Client.RsdoctorClientPackagesDiffResult['added'] = [];
  const removed: Client.RsdoctorClientPackagesDiffResult['removed'] = [];
  const changed: Client.RsdoctorClientPackageDiffItem[] = [];

  for (const [key, bPkg] of baselineMap) {
    const cPkg = currentMap.get(key);
    if (!cPkg) {
      removed.push({
        name: bPkg.name,
        version: bPkg.version,
        root: bPkg.root,
        size: bPkg.size,
      });
    } else if (bPkg.size.parsedSize !== cPkg.size.parsedSize) {
      const { percent, state } = diffSize(
        bPkg.size.parsedSize,
        cPkg.size.parsedSize,
      );
      changed.push({
        name: bPkg.name,
        version: bPkg.version,
        root: bPkg.root,
        size: { baseline: bPkg.size, current: cPkg.size },
        percent,
        state,
      });
    }
  }

  for (const [key, cPkg] of currentMap) {
    if (!baselineMap.has(key)) {
      added.push({
        name: cPkg.name,
        version: cPkg.version,
        root: cPkg.root,
        size: cPkg.size,
      });
    }
  }

  return { added, removed, changed };
}

/**
 * Compute the full bundle diff result between baseline and current manifest data.
 * Combines asset, module, and package diffs into a single result.
 */
export function getBundleDiffResult(
  baseline: SDK.BuilderStoreData,
  current: SDK.BuilderStoreData,
): Client.RsdoctorClientBundleDiffResult {
  return {
    assets: getAssetsDiffResult(baseline.chunkGraph, current.chunkGraph),
    modules: getModulesDiffResult(baseline.moduleGraph, current.moduleGraph),
    packages: getPackagesDiffResult(
      baseline.packageGraph,
      current.packageGraph,
    ),
  };
}
