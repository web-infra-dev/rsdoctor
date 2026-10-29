import type { SDK } from '@rsdoctor/shared/types';
import type { DataNode } from 'src/utils/file';

export type ModuleTreeSort = 'original' | 'parsedSize' | 'sourceSize';

type ModuleTreeSize = Pick<SDK.ModuleSize, 'parsedSize' | 'sourceSize'>;

const getSize = (mod: SDK.ModuleData | undefined): ModuleTreeSize => ({
  parsedSize: mod?.size?.parsedSize ?? 0,
  sourceSize: mod?.size?.sourceSize ?? 0,
});

export function getModuleTreeSizes(
  treeData: DataNode[],
  filteredModulesMap: ReadonlyMap<string, SDK.ModuleData>,
  includeModulesMap: ReadonlyMap<string, SDK.ModuleData>,
): Map<DataNode['key'], ModuleTreeSize> {
  const sizes = new Map<DataNode['key'], ModuleTreeSize>();

  const visit = (node: DataNode): ModuleTreeSize => {
    if (node.isLeaf) {
      const path: string = node.__RESOURCEPATH__ ?? '';
      const normalizedPath = path.replace(/\\/g, '/');
      sizes.set(node.key, getSize(filteredModulesMap.get(normalizedPath)));

      // Directory labels use the full module map for each visible file path.
      // The filtered map can select a different module sharing that path.
      return getSize(includeModulesMap.get(normalizedPath));
    }

    const total = { parsedSize: 0, sourceSize: 0 };
    for (const child of node.children ?? []) {
      const childSize = visit(child);
      total.parsedSize += childSize.parsedSize;
      total.sourceSize += childSize.sourceSize;
    }
    sizes.set(node.key, total);
    return total;
  };

  treeData.forEach(visit);
  return sizes;
}

export function sortModuleTree(
  treeData: DataNode[],
  sizes: ReadonlyMap<DataNode['key'], ModuleTreeSize>,
  sortBy: ModuleTreeSort,
): DataNode[] {
  if (sortBy === 'original') return treeData;

  return treeData
    .map((node) =>
      node.children
        ? { ...node, children: sortModuleTree(node.children, sizes, sortBy) }
        : node,
    )
    .sort(
      (a, b) =>
        (sizes.get(b.key)?.[sortBy] ?? 0) - (sizes.get(a.key)?.[sortBy] ?? 0),
    );
}
