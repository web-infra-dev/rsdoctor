import type { SDK } from '@rsdoctor/shared/types';
import path from 'path-browserify';

export function getSideEffectModules(
  modules: SDK.ModuleData[],
  data?: SDK.TreeShakingData,
  search = '',
) {
  const keyword = search.toLowerCase();
  return modules.filter(
    (module) =>
      data?.sideEffectCodes[module.id]?.length &&
      module.path.toLowerCase().includes(keyword),
  );
}

interface SideEffectTreeNode {
  key: string;
  title: string;
  selectable?: boolean;
  children?: SideEffectTreeNode[];
}

export function getSideEffectTree(modules: SDK.ModuleData[], cwd: string) {
  const roots: SideEffectTreeNode[] = [];
  const normalizedCwd = cwd.replace(/\\/g, '/');
  for (const module of modules) {
    const normalizedPath = module.path.replace(/\\/g, '/');
    const parts = [
      module.layer || 'Modules',
      ...path
        .relative(normalizedCwd, normalizedPath)
        .split('/')
        .filter(Boolean),
    ];
    const filename = parts.pop() || normalizedPath;
    let children = roots;
    let key = 'directory';
    for (const part of parts) {
      key += `/${part}`;
      let node = children.find((item) => item.key === key);
      if (!node) {
        node = { key, title: part, selectable: false, children: [] };
        children.push(node);
      }
      children = node.children!;
    }
    children.push({ key: `module:${module.id}`, title: filename });
  }
  return roots;
}
