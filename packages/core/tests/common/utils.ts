import { relative } from 'path';
import { SDK } from '@rsdoctor/types';
export function removeAbsModulePath(
  graph: SDK.ModuleGraphInstance,
  root: string,
) {
  for (const mod of graph.getModules()) {
    (mod as any).path = relative(root, mod.path);
  }
}
