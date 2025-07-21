import { SDK } from '@rsdoctor/types';
import { useMemo } from 'react';
import { formatSize, getShortPath } from 'src/utils';
import { getImporteds } from '.';
import { Lodash } from '@rsdoctor/utils/common';

export type NewTreeNodeType = {
  __RESOURCEPATH__: string;
  id: number;
  key: string;
  name: string;
  level: number;
  kind: number;
  size?: string;
  concatModules: number[] | undefined;
  chunks?: string[];
  getChildren?: () => NewTreeNodeType[];
  dependencies?: number[];
  fatherPath?: string;
  children?: number[];
  needExpand?: boolean | string;
};

export function useCreateFileTreeData(
  modules: SDK.ModuleData[],
  importedModules: SDK.ModuleData[],
  curModule: SDK.ModuleData,
): { data: NewTreeNodeType[] } {
  return useMemo(() => {
    if (!importedModules || !importedModules?.length) {
      return { filterData: [], data: [] };
    }
    const root = Lodash.compact(
      importedModules?.map((imported, index) => {
        return {
          key: `0-${index}`,
          name: getShortPath(imported.path),
          __RESOURCEPATH__: imported.path,
          id: imported.id,
          level: 1,
          chunks: imported.chunks,
          size: formatSize(imported.size.parsedSize),
          kind: imported.kind,
          concatModules: imported.concatenationModules,
          fatherPath: getShortPath(curModule.path),
          dependencies: imported.dependencies,
          getChildren: () => getLeafs(imported, modules, curModule),
          children: imported.imported,
        };
      }),
    );
    // getAllTreeData(root, modules, 2, importedModules);
    return {
      data: root,
    };
  }, [importedModules, curModule]);
}

function getLeafs(
  imported: SDK.ModuleData,
  modules: SDK.ModuleData[],
  fatherModule: SDK.ModuleData,
) {
  const leafModules = getImporteds(imported, modules);

  const leafs = leafModules?.map((_imported, index) => {
    return {
      key: `0-${index}`,
      name: getShortPath(_imported.path),
      __RESOURCEPATH__: _imported.path,
      id: _imported.id,
      level: 1,
      size: formatSize(_imported.size.parsedSize),
      kind: _imported.kind,
      chunks: _imported.chunks,
      concatModules: _imported.concatenationModules,
      fatherPath: getShortPath(fatherModule.path),
      dependencies: _imported.dependencies,
      getChildren: () => getLeafs(_imported, modules, imported),
      children: _imported.imported,
    };
  });
  return leafs;
}

export function getContactMainModulePath(
  concatModules: number[],
  modules: SDK.ModuleData[],
): string[] {
  const concatModulesPath = concatModules?.map(
    (cm) => modules.filter((m) => m.id === cm)?.[0],
  );
  return concatModulesPath?.map((m) => m.path);
}
