import { SDK } from '@rsdoctor/shared/types';
import React from 'react';
import { Space } from './space';

export function TreeShakingDataBoundary({
  moduleGraph,
  children,
}: {
  moduleGraph: SDK.ModuleGraphInstance;
  children: React.ReactNode;
}) {
  const modules = moduleGraph
    .getModules()
    .filter((module) => module.kind === SDK.ModuleKind.Normal);

  // Native reports can contain modules and sideEffectCodes without the legacy
  // export graph required by this page's file tree, table and editor.
  if (
    modules.length === 0 ||
    modules.some((module) => !moduleGraph.getModuleGraphModule(module))
  ) {
    return <Space />;
  }

  return children;
}
