import { SDK } from '@rsdoctor/types';
import { Lodash } from '@rsdoctor/utils/common';

export const getImporteds = (
  curModule: SDK.ModuleData,
  modules: SDK.ModuleData[],
) => {
  if (curModule?.imported?.length) {
    const _importeds = curModule.imported.map((_importedModule) =>
      modules.find((m) => m.id === Number(_importedModule)),
    );
    const importeds: SDK.ModuleData[] = Lodash.compact(_importeds);
    return importeds;
  }
  return [];
};

export const getModuleReasonsTree = (
  curModule: SDK.ModuleData,
  modules: SDK.ModuleData[],
  reasonsTree: string[],
  visited: Map<number, boolean>,
) => {
  if (!visited.has(curModule.id)) {
    visited.set(curModule.id, true);
  } else if (visited.get(curModule.id)) {
    return;
  }

  const importeds = getImporteds(curModule, modules);

  if (!importeds.length) {
    return;
  }

  importeds.forEach((_curModule) => {
    _curModule?.chunks?.forEach((_chunk) => {
      if (reasonsTree.indexOf(_chunk) < 0) {
        reasonsTree.push(_chunk);
      }
    });

    getModuleReasonsTree(_curModule, modules, reasonsTree, visited);
  });
};
