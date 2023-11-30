import { ModuleGraph } from '@rsdoctor/sdk/graph';
import { relative } from 'path';

export function removeAbsModulePath(graph: ModuleGraph, root: string) {
  for (const mod of graph.getModules()) {
    (mod as any).path = relative(root, mod.path);
  }
}