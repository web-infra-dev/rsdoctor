import fs from 'node:fs';
import path from 'node:path';
import { SDK } from '@rsdoctor/types';

const JS_LIKE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
]);
const CHUNK_GROUP_PATH_LIMIT = 50;
const PATH_TOP_MODULE_LIMIT = 20;

type AnyChunk = any;
type AnyChunkGroup = any;
type AnyCompilation = any;
type AnyModule = any;

const safeInvoke = <T>(getter: () => T): T | undefined => {
  try {
    return getter();
  } catch {
    return undefined;
  }
};

const toArray = <T>(value: Iterable<T> | ArrayLike<T> | null | undefined) => {
  if (!value) {
    return [] as T[];
  }
  return Array.from(value);
};

const getChunkGroupName = (chunkGroup: AnyChunkGroup, fallbackId: number) =>
  String(chunkGroup?.name ?? chunkGroup?.id ?? `chunk-group-${fallbackId}`);

const isInitialChunkGroup = (chunkGroup: AnyChunkGroup) => {
  const result = safeInvoke(() => chunkGroup?.isInitial?.());
  if (typeof result === 'boolean') {
    return result;
  }
  return Boolean(chunkGroup?.initial);
};

const getModuleName = (compilation: AnyCompilation, module: AnyModule) => {
  const requestShortener = compilation?.requestShortener;
  return (
    safeInvoke(() => module?.readableIdentifier?.(requestShortener)) ??
    safeInvoke(() => module?.nameForCondition?.()) ??
    module?.resource ??
    safeInvoke(() => module?.identifier?.()) ??
    'unknown-module'
  );
};

const getModuleResource = (compilerContext: string, module: AnyModule) => {
  const candidates = [
    module?.resource,
    safeInvoke(() => module?.nameForCondition?.()),
    module?.rootModule?.resource,
  ].filter((item): item is string => typeof item === 'string' && item.length > 0);

  if (!candidates.length) {
    return null;
  }

  return path.isAbsolute(candidates[0])
    ? candidates[0]
    : path.resolve(compilerContext, candidates[0]);
};

const normalizeResource = (
  compilerContext: string,
  resource: string | null | undefined,
) => {
  if (!resource) {
    return null;
  }
  return path.isAbsolute(resource)
    ? resource
    : path.resolve(compilerContext, resource);
};

const getModuleKey = (
  compilation: AnyCompilation,
  compilerContext: string,
  module: AnyModule,
) =>
  String(
    safeInvoke(() => module?.identifier?.()) ??
      getModuleResource(compilerContext, module) ??
      getModuleName(compilation, module),
  );

const isExternalModule = (compilation: AnyCompilation, module: AnyModule) =>
  getModuleName(compilation, module).startsWith('external ');

const isJavaScriptLikeResource = (resource: string | null) =>
  Boolean(resource && JS_LIKE_EXTENSIONS.has(path.extname(resource)));

const getAssetSize = (compilation: AnyCompilation, file: string) => {
  const directAsset = compilation?.assets?.[file];
  if (directAsset && typeof directAsset.size === 'function') {
    return directAsset.size();
  }

  const asset = safeInvoke(() => compilation?.getAsset?.(file));
  if (asset?.source && typeof asset.source.size === 'function') {
    return asset.source.size();
  }

  return 0;
};

const getModuleSizeRobust = (chunkGraph: AnyCompilation['chunkGraph'], module: AnyModule) => {
  let size = 0;

  try {
    size = chunkGraph?.getModuleSize?.(module) ?? 0;
  } catch {}

  if (!size) {
    try {
      size = module?.size?.() ?? 0;
    } catch {}
  }

  if (!size) {
    try {
      const sourceTypes = module?.getSourceTypes?.();
      if (sourceTypes) {
        for (const sourceType of sourceTypes) {
          size += module.size(sourceType);
        }
      }
    } catch {}
  }

  return size || 0;
};

const getOutgoingModules = (moduleGraph: AnyCompilation['moduleGraph'], module: AnyModule) => {
  const targets = new Set<AnyModule>();
  const connections = safeInvoke(() => moduleGraph?.getOutgoingConnections?.(module));

  for (const connection of toArray<any>(connections)) {
    if (!connection?.module || connection?.weak) {
      continue;
    }

    const dependency = connection.dependency;
    if (dependency) {
      const parentBlock = safeInvoke(() => moduleGraph?.getParentBlock?.(dependency));
      if (
        parentBlock &&
        parentBlock !== module &&
        parentBlock?.constructor?.name?.includes('AsyncDependenciesBlock')
      ) {
        continue;
      }
    }

    targets.add(connection.module);
  }

  return targets;
};

const getGroupModules = (
  chunkGroup: AnyChunkGroup,
  chunkModulesMap: Map<AnyChunk, Set<AnyModule>>,
) => {
  const modules = new Set<AnyModule>();

  for (const chunk of toArray<AnyChunk>(chunkGroup?.chunks)) {
    for (const module of chunkModulesMap.get(chunk) ?? []) {
      modules.add(module);
    }
  }

  return modules;
};

const getRootModules = (
  chunkGroup: AnyChunkGroup,
  actualModules: Set<AnyModule>,
  chunkGraph: AnyCompilation['chunkGraph'],
  moduleGraph: AnyCompilation['moduleGraph'],
) => {
  const roots = new Set<AnyModule>();

  if (isInitialChunkGroup(chunkGroup)) {
    for (const chunk of toArray<AnyChunk>(chunkGroup?.chunks)) {
      const entryModules = safeInvoke(() =>
        chunkGraph?.getChunkEntryModulesIterable?.(chunk),
      );
      for (const module of toArray<AnyModule>(entryModules)) {
        roots.add(module);
      }
    }
    return roots;
  }

  for (const origin of toArray<any>(chunkGroup?.origins)) {
    if (origin?.dependency) {
      const targetModule = safeInvoke(() => moduleGraph?.getModule?.(origin.dependency));
      if (targetModule) {
        roots.add(targetModule);
        continue;
      }
    }

    if (!origin?.module) {
      continue;
    }

    const blocks = toArray<any>(safeInvoke(() => origin.module.blocks));
    for (const block of blocks) {
      for (const dependency of toArray<any>(block?.dependencies)) {
        const targetModule = safeInvoke(() => moduleGraph?.getModule?.(dependency));
        if (targetModule && actualModules.has(targetModule)) {
          roots.add(targetModule);
        }
      }
    }
  }

  if (!roots.size) {
    for (const chunk of toArray<AnyChunk>(chunkGroup?.chunks)) {
      const entryModules = safeInvoke(() =>
        chunkGraph?.getChunkEntryModulesIterable?.(chunk),
      );
      for (const module of toArray<AnyModule>(entryModules)) {
        roots.add(module);
      }
    }
  }

  return roots;
};

const buildSnippet = (
  linesCache: Map<string, string[] | null>,
  absolutePath: string,
  loc: any,
) => {
  if (!loc?.start?.line) {
    return '';
  }

  let lines = linesCache.get(absolutePath);
  if (!linesCache.has(absolutePath)) {
    try {
      lines = fs.readFileSync(absolutePath, 'utf8').split('\n');
    } catch {
      lines = null;
    }
    linesCache.set(absolutePath, lines);
  }

  if (!lines) {
    return '';
  }

  const startLine = Math.max(0, loc.start.line - 1);
  const endLine = loc?.end?.line
    ? Math.min(lines.length, loc.end.line)
    : startLine + 1;

  return lines
    .slice(startLine, Math.min(endLine, startLine + 3))
    .map((line, index) => `${startLine + index + 1} | ${line}`)
    .join('\n');
};

type InternalChunkGroupNode = Omit<
  SDK.ChunkGroupGraphNodeData,
  | 'removableJSModuleCount'
  | 'removableJSSize'
  | 'inheritedRemovableJSModuleCount'
  | 'inheritedRemovableJSSize'
  | 'inheritedRemovableJSModules'
  | 'removableJSModules'
> & {
  localRemovableById: Map<string, SDK.ChunkGroupGraphModuleData>;
};

const buildAdjacencyMaps = (edges: SDK.ChunkGroupGraphEdgeData[]) => {
  const forward = new Map<string, string[]>();
  const reverse = new Map<string, string[]>();

  for (const edge of edges) {
    if (!forward.has(edge.from)) {
      forward.set(edge.from, []);
    }
    forward.get(edge.from)!.push(edge.to);

    if (!reverse.has(edge.to)) {
      reverse.set(edge.to, []);
    }
    reverse.get(edge.to)!.push(edge.from);
  }

  return {
    forward,
    reverse,
  };
};

const intersectModuleMaps = (
  maps: Array<Map<string, SDK.ChunkGroupGraphModuleData>>,
) => {
  if (!maps.length) {
    return new Map<string, SDK.ChunkGroupGraphModuleData>();
  }

  const [first, ...rest] = maps;
  const result = new Map(first);

  for (const key of [...result.keys()]) {
    if (!rest.every((map) => map.has(key))) {
      result.delete(key);
    }
  }

  return result;
};

const sumModuleSizes = (
  modules: Iterable<SDK.ChunkGroupGraphModuleData>,
) => {
  let total = 0;
  for (const module of modules) {
    total += module.size;
  }
  return total;
};

const getPathEdgeIds = (nodeIds: string[]) => {
  const edgeIds: string[] = [];
  for (let index = 0; index < nodeIds.length - 1; index++) {
    edgeIds.push(`${nodeIds[index]}->${nodeIds[index + 1]}`);
  }
  return edgeIds;
};

const getPathSeverity = (
  unnecessarySize: number,
  totalJSSize: number,
): SDK.ChunkGroupGraphPathSeverity => {
  const ratio = totalJSSize > 0 ? unnecessarySize / totalJSSize : 0;
  if (ratio > 1 / 3) {
    return 'danger';
  }
  if (unnecessarySize > 0) {
    return 'warning';
  }
  return 'normal';
};

const getSeverityRank = (severity: SDK.ChunkGroupGraphPathSeverity) => {
  if (severity === 'danger') {
    return 2;
  }
  if (severity === 'warning') {
    return 1;
  }
  return 0;
};

const findPathsToTarget = (
  targetId: string,
  entryIds: string[],
  forwardAdjacency: Map<string, string[]>,
  fallbackNodeId?: string,
  maxPaths = CHUNK_GROUP_PATH_LIMIT,
) => {
  const paths: string[][] = [];
  let truncated = false;
  const entries = entryIds.length
    ? entryIds
    : fallbackNodeId
      ? [fallbackNodeId]
      : [];

  const dfs = (
    current: string,
    visited: Set<string>,
    currentPath: string[],
  ) => {
    if (paths.length >= maxPaths) {
      truncated = true;
      return;
    }

    if (current === targetId) {
      paths.push([...currentPath]);
      return;
    }

    for (const next of forwardAdjacency.get(current) ?? []) {
      if (visited.has(next)) {
        continue;
      }
      visited.add(next);
      currentPath.push(next);
      dfs(next, visited, currentPath);
      currentPath.pop();
      visited.delete(next);

      if (paths.length >= maxPaths) {
        truncated = true;
        return;
      }
    }
  };

  for (const entryId of entries) {
    dfs(entryId, new Set([entryId]), [entryId]);
    if (paths.length >= maxPaths) {
      truncated = true;
      break;
    }
  }

  if (!paths.length && entries.includes(targetId)) {
    paths.push([targetId]);
  }

  return {
    paths,
    truncated,
  };
};

const buildNodeSearchText = (
  node: Pick<
    SDK.ChunkGroupGraphNodeData,
    | 'name'
    | 'chunks'
    | 'localRemovableJSModules'
    | 'removableJSModules'
    | 'inheritedRemovableJSModules'
  >,
  incomingImports: SDK.ChunkGroupGraphIncomingImportData[],
) => {
  const parts = new Set<string>();
  const addPart = (value: string | null | undefined) => {
    if (!value) {
      return;
    }
    const normalized = value.trim();
    if (normalized) {
      parts.add(normalized);
    }
  };

  addPart(node.name);
  node.chunks.forEach((chunk) => {
    addPart(chunk.name);
    chunk.files.forEach((file) => addPart(file));
  });
  [
    ...node.localRemovableJSModules,
    ...node.removableJSModules,
    ...node.inheritedRemovableJSModules,
  ].forEach((module) => {
    addPart(module.resource);
    addPart(module.name);
  });
  incomingImports.forEach((item) => {
    addPart(item.fromName);
    addPart(item.request);
    addPart(item.sourceModule);
    addPart(item.loc);
  });

  return [...parts].join('\n');
};

export function buildChunkGroupGraphReport(
  compilation: AnyCompilation,
  compilerContext: string,
): SDK.ChunkGroupGraphData | undefined {
  const chunkGraph = compilation?.chunkGraph;
  const moduleGraph = compilation?.moduleGraph;
  const chunkGroups = toArray<AnyChunkGroup>(compilation?.chunkGroups);

  if (!chunkGraph || !moduleGraph || !chunkGroups.length) {
    return undefined;
  }

  const chunkModulesMap = new Map<AnyChunk, Set<AnyModule>>();
  for (const chunk of toArray<AnyChunk>(compilation?.chunks)) {
    const modules = new Set<AnyModule>();
    const chunkModules = safeInvoke(() => chunkGraph?.getChunkModulesIterable?.(chunk));
    for (const module of toArray<AnyModule>(chunkModules)) {
      modules.add(module);
    }
    chunkModulesMap.set(chunk, modules);
  }

  const chunkToGroups = new Map<AnyChunk, Set<AnyChunkGroup>>();
  for (const chunkGroup of chunkGroups) {
    for (const chunk of toArray<AnyChunk>(chunkGroup?.chunks)) {
      if (!chunkToGroups.has(chunk)) {
        chunkToGroups.set(chunk, new Set());
      }
      chunkToGroups.get(chunk)!.add(chunkGroup);
    }
  }

  const resourceToGroups = new Map<string, Set<AnyChunkGroup>>();
  const registerResourceGroups = (
    resource: string | null | undefined,
    groups: Set<AnyChunkGroup>,
  ) => {
    const normalizedResource = normalizeResource(compilerContext, resource);
    if (!normalizedResource) {
      return;
    }
    if (!resourceToGroups.has(normalizedResource)) {
      resourceToGroups.set(normalizedResource, new Set());
    }
    for (const group of groups) {
      resourceToGroups.get(normalizedResource)!.add(group);
    }
  };

  for (const chunk of toArray<AnyChunk>(compilation?.chunks)) {
    const groups = chunkToGroups.get(chunk) ?? new Set<AnyChunkGroup>();
    for (const module of chunkModulesMap.get(chunk) ?? []) {
      registerResourceGroups(
        module?.resource ?? safeInvoke(() => module?.nameForCondition?.()),
        groups,
      );
      registerResourceGroups(module?.rootModule?.resource, groups);

      for (const innerModule of toArray<any>(safeInvoke(() => module?.modules))) {
        registerResourceGroups(
          innerModule?.resource ??
            safeInvoke(() => innerModule?.nameForCondition?.()),
          groups,
        );
      }
    }
  }

  const chunkGroupIdMap = new Map<AnyChunkGroup, string>();
  const localNodes: InternalChunkGroupNode[] = [];

  chunkGroups.forEach((chunkGroup: AnyChunkGroup, index) => {
    const nodeId = `cg_${index}`;
    chunkGroupIdMap.set(chunkGroup, nodeId);

    const actualModules = getGroupModules(chunkGroup, chunkModulesMap);
    const roots = getRootModules(chunkGroup, actualModules, chunkGraph, moduleGraph);
    const visited = new Set<AnyModule>();
    const queue = [...roots];

    while (queue.length) {
      const current = queue.shift();
      if (!current || visited.has(current)) {
        continue;
      }
      visited.add(current);

      for (const target of getOutgoingModules(moduleGraph, current)) {
        if (!visited.has(target)) {
          queue.push(target);
        }
      }
    }

    const reachableModules = new Set<AnyModule>();
    for (const module of actualModules) {
      if (visited.has(module)) {
        reachableModules.add(module);
      }
    }

    for (const module of actualModules) {
      if (reachableModules.has(module)) {
        continue;
      }

      const incomingConnections = safeInvoke(() =>
        moduleGraph?.getIncomingConnections?.(module),
      );
      for (const connection of toArray<any>(incomingConnections)) {
        if (
          !connection?.originModule ||
          connection.originModule === module ||
          connection.weak
        ) {
          continue;
        }

        const originName = getModuleName(compilation, connection.originModule);
        if (visited.has(connection.originModule) || originName.includes(' + ')) {
          reachableModules.add(module);
          break;
        }
      }
    }

    let totalEmittedSize = 0;
    let groupTotalJSSize = 0;

    const chunks = toArray<AnyChunk>(chunkGroup?.chunks)
      .map((chunk: AnyChunk) => {
        const chunkId = String(chunk?.id ?? chunk?.ukey ?? chunk?.name ?? 'unknown');
        let emittedSize = 0;
        const files = toArray<string>(chunk?.files).filter(
          (file): file is string =>
            typeof file === 'string' && file.endsWith('.js'),
        );

        for (const file of files) {
          emittedSize += getAssetSize(compilation, file);
        }

        let totalJSSize = 0;
        const chunkModules = chunkModulesMap.get(chunk) ?? new Set<AnyModule>();
        for (const module of chunkModules) {
          totalJSSize += getModuleSizeRobust(chunkGraph, module);
        }

        totalEmittedSize += emittedSize;
        groupTotalJSSize += totalJSSize;

        return {
          id: chunkId,
          name: String(chunk?.name ?? chunk?.id ?? chunkId),
          emittedSize,
          totalJSSize,
          moduleCount: chunkModules.size,
          files,
        };
      })
      .sort((a, b) => b.emittedSize - a.emittedSize);

    const localRemovableJSModules: SDK.ChunkGroupGraphModuleData[] = [];
    let nonJSResidualCount = 0;

    for (const module of actualModules) {
      if (reachableModules.has(module) || isExternalModule(compilation, module)) {
        continue;
      }

      const resource = getModuleResource(compilerContext, module);
      const size = getModuleSizeRobust(chunkGraph, module);

      if (isJavaScriptLikeResource(resource)) {
        localRemovableJSModules.push({
          id: getModuleKey(compilation, compilerContext, module),
          name: getModuleName(compilation, module),
          resource: resource ? path.relative(compilerContext, resource) : null,
          size,
        });
      } else {
        nonJSResidualCount++;
      }
    }

    const sortedLocalRemovableJSModules = localRemovableJSModules.sort(
      (a, b) => b.size - a.size,
    );

    localNodes.push({
      id: nodeId,
      name: getChunkGroupName(chunkGroup, index),
      isInitial: isInitialChunkGroup(chunkGroup),
      totalEmittedSize,
      groupTotalJSSize,
      actualModuleCount: actualModules.size,
      rootModuleCount: roots.size,
      reachableModuleCount: reachableModules.size,
      localRemovableJSModuleCount: sortedLocalRemovableJSModules.length,
      localRemovableJSSize: sumModuleSizes(sortedLocalRemovableJSModules),
      nonJSResidualCount,
      chunks,
      localRemovableJSModules: sortedLocalRemovableJSModules,
      localRemovableById: new Map(
        sortedLocalRemovableJSModules.map((module) => [module.id, module]),
      ),
    });
  });

  const sourceFileCache = new Map<string, string[] | null>();
  const edgeMap = new Map<string, SDK.ChunkGroupGraphEdgeData>();

  for (const chunkGroup of chunkGroups) {
    if (isInitialChunkGroup(chunkGroup)) {
      continue;
    }

    const targetId = chunkGroupIdMap.get(chunkGroup);
    if (!targetId) {
      continue;
    }

    for (const origin of toArray<any>(chunkGroup?.origins)) {
      if (!origin?.module) {
        continue;
      }

      const moduleResource = getModuleResource(compilerContext, origin.module);
      const relativeModulePath = moduleResource
        ? path.relative(compilerContext, moduleResource)
        : null;
      const snippet = moduleResource
        ? buildSnippet(sourceFileCache, moduleResource, origin.loc)
        : '';
      const loc = origin?.loc?.start
        ? `${relativeModulePath ?? '?'}:${origin.loc.start.line}:${origin.loc.start.column}`
        : relativeModulePath ?? '';

      const sourceGroups = new Set<AnyChunkGroup>();
      const originResources = [
        origin.module?.resource,
        safeInvoke(() => origin.module?.nameForCondition?.()),
        origin.module?.rootModule?.resource,
      ].filter((item): item is string => typeof item === 'string' && item.length > 0);

      for (const resource of originResources) {
        const normalizedResource = normalizeResource(compilerContext, resource);
        if (!normalizedResource) {
          continue;
        }
        for (const group of resourceToGroups.get(normalizedResource) ?? []) {
          sourceGroups.add(group);
        }
      }

      for (const sourceGroup of sourceGroups) {
        const sourceId = chunkGroupIdMap.get(sourceGroup);
        if (!sourceId || sourceId === targetId) {
          continue;
        }

        const edgeId = `${sourceId}->${targetId}`;
        if (!edgeMap.has(edgeId)) {
          edgeMap.set(edgeId, {
            id: edgeId,
            from: sourceId,
            to: targetId,
            fromName: '',
            toName: '',
            imports: [],
          });
        }

        const edge = edgeMap.get(edgeId)!;
        const request = String(origin?.request ?? '');
        const isDuplicate = edge.imports.some(
          (item) =>
            item.loc === loc &&
            item.request === request &&
            item.sourceModule === relativeModulePath,
        );

        if (!isDuplicate) {
          edge.imports.push({
            ...(loc ? { loc } : {}),
            ...(request ? { request } : {}),
            ...(snippet ? { snippet } : {}),
            ...(relativeModulePath ? { sourceModule: relativeModulePath } : {}),
          });
        }
      }
    }
  }

  const edges = [...edgeMap.values()];
  const { forward, reverse } = buildAdjacencyMaps(edges);
  const indegree = new Map<string, number>(
    localNodes.map((node) => [node.id, reverse.get(node.id)?.length ?? 0]),
  );
  const zeroIndegreeQueue = localNodes
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .sort((a, b) => {
      if (a.isInitial !== b.isInitial) {
        return a.isInitial ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    })
    .map((node) => node.id);
  const topologicalOrder: string[] = [];

  while (zeroIndegreeQueue.length) {
    const currentId = zeroIndegreeQueue.shift()!;
    topologicalOrder.push(currentId);

    for (const nextId of forward.get(currentId) ?? []) {
      const nextIndegree = (indegree.get(nextId) ?? 0) - 1;
      indegree.set(nextId, nextIndegree);
      if (nextIndegree === 0) {
        zeroIndegreeQueue.push(nextId);
      }
    }
  }

  for (const node of localNodes) {
    if (!topologicalOrder.includes(node.id)) {
      topologicalOrder.push(node.id);
    }
  }

  const nodeMap = new Map(localNodes.map((node) => [node.id, node]));
  const guaranteedInclusiveRemovableByNode = new Map<
    string,
    Map<string, SDK.ChunkGroupGraphModuleData>
  >();
  const incrementalRemovableByNode = new Map<
    string,
    Map<string, SDK.ChunkGroupGraphModuleData>
  >();
  const inheritedRemovableByNode = new Map<
    string,
    Map<string, SDK.ChunkGroupGraphModuleData>
  >();

  for (const nodeId of topologicalOrder) {
    const node = nodeMap.get(nodeId);
    if (!node) {
      continue;
    }

    const parentSets = (reverse.get(nodeId) ?? [])
      .map((parentId) => guaranteedInclusiveRemovableByNode.get(parentId))
      .filter(
        (
          modules,
        ): modules is Map<string, SDK.ChunkGroupGraphModuleData> =>
          Boolean(modules),
      );
    const guaranteedBefore = intersectModuleMaps(parentSets);
    const incrementalRemovable = new Map<string, SDK.ChunkGroupGraphModuleData>();
    const inheritedRemovable = new Map<string, SDK.ChunkGroupGraphModuleData>();

    for (const [moduleId, module] of node.localRemovableById) {
      if (guaranteedBefore.has(moduleId)) {
        inheritedRemovable.set(moduleId, module);
      } else {
        incrementalRemovable.set(moduleId, module);
      }
    }

    const guaranteedInclusive = new Map(guaranteedBefore);
    for (const [moduleId, module] of node.localRemovableById) {
      guaranteedInclusive.set(moduleId, module);
    }

    guaranteedInclusiveRemovableByNode.set(nodeId, guaranteedInclusive);
    incrementalRemovableByNode.set(nodeId, incrementalRemovable);
    inheritedRemovableByNode.set(nodeId, inheritedRemovable);
  }

  const baseNodes = localNodes.map((node) => {
    const incrementalRemovable = [
      ...(incrementalRemovableByNode.get(node.id)?.values() ?? []),
    ].sort((a, b) => b.size - a.size);
    const inheritedRemovable = [
      ...(inheritedRemovableByNode.get(node.id)?.values() ?? []),
    ].sort((a, b) => b.size - a.size);

    return {
      id: node.id,
      name: node.name,
      isInitial: node.isInitial,
      totalEmittedSize: node.totalEmittedSize,
      groupTotalJSSize: node.groupTotalJSSize,
      actualModuleCount: node.actualModuleCount,
      rootModuleCount: node.rootModuleCount,
      reachableModuleCount: node.reachableModuleCount,
      localRemovableJSModuleCount: node.localRemovableJSModuleCount,
      localRemovableJSSize: node.localRemovableJSSize,
      removableJSModuleCount: incrementalRemovable.length,
      removableJSSize: sumModuleSizes(incrementalRemovable),
      inheritedRemovableJSModuleCount: inheritedRemovable.length,
      inheritedRemovableJSSize: sumModuleSizes(inheritedRemovable),
      nonJSResidualCount: node.nonJSResidualCount,
      chunks: node.chunks,
      localRemovableJSModules: node.localRemovableJSModules,
      inheritedRemovableJSModules: inheritedRemovable,
      removableJSModules: incrementalRemovable,
    };
  });

  const entryNodeIds = baseNodes
    .filter((node) => node.isInitial)
    .map((node) => node.id);
  const fallbackNodeId = baseNodes[0]?.id;
  const baseNodeMap = new Map(baseNodes.map((node) => [node.id, node]));
  const enrichedEdges: SDK.ChunkGroupGraphEdgeData[] = edges.map((edge) => ({
    ...edge,
    fromName: baseNodeMap.get(edge.from)?.name ?? edge.from,
    toName: baseNodeMap.get(edge.to)?.name ?? edge.to,
  }));
  const incomingEdgesByNode = new Map<string, SDK.ChunkGroupGraphEdgeData[]>();
  const outgoingEdgesByNode = new Map<string, SDK.ChunkGroupGraphEdgeData[]>();

  for (const edge of enrichedEdges) {
    if (!incomingEdgesByNode.has(edge.to)) {
      incomingEdgesByNode.set(edge.to, []);
    }
    incomingEdgesByNode.get(edge.to)!.push(edge);

    if (!outgoingEdgesByNode.has(edge.from)) {
      outgoingEdgesByNode.set(edge.from, []);
    }
    outgoingEdgesByNode.get(edge.from)!.push(edge);
  }

  const nodes: SDK.ChunkGroupGraphNodeData[] = baseNodes.map((node) => {
    const incomingEdges = incomingEdgesByNode.get(node.id) ?? [];
    const outgoingEdges = outgoingEdgesByNode.get(node.id) ?? [];
    const incomingImports = incomingEdges
      .flatMap((edge) =>
        edge.imports.map((item) => ({
          ...item,
          edgeId: edge.id,
          from: edge.from,
          fromName: edge.fromName,
          to: edge.to,
          toName: edge.toName,
        })),
      )
      .sort((a, b) => {
        if (a.fromName !== b.fromName) {
          return a.fromName.localeCompare(b.fromName);
        }
        return (a.request ?? '').localeCompare(b.request ?? '');
      });

    const { paths: nodePaths, truncated } = findPathsToTarget(
      node.id,
      entryNodeIds,
      forward,
      fallbackNodeId,
      CHUNK_GROUP_PATH_LIMIT,
    );

    const paths = nodePaths
      .map((nodeIds, index) => {
        const uniqueChunks = new Map<string, SDK.ChunkGroupGraphChunkData>();
        const unnecessaryModules = new Map<
          string,
          SDK.ChunkGroupGraphModuleData
        >();
        const nodeNames = nodeIds.map(
          (nodeId) => baseNodeMap.get(nodeId)?.name ?? nodeId,
        );

        nodeIds.forEach((nodeId) => {
          const pathNode = baseNodeMap.get(nodeId);
          if (!pathNode) {
            return;
          }

          pathNode.chunks.forEach((chunk) => {
            if (!uniqueChunks.has(chunk.id)) {
              uniqueChunks.set(chunk.id, chunk);
            }
          });

          pathNode.localRemovableJSModules.forEach((module) => {
            if (!unnecessaryModules.has(module.id)) {
              unnecessaryModules.set(module.id, module);
            }
          });
        });

        const chunks = [...uniqueChunks.values()].sort(
          (a, b) => b.emittedSize - a.emittedSize,
        );
        const allUnnecessaryModules = [...unnecessaryModules.values()].sort(
          (a, b) => b.size - a.size,
        );
        const totalEmittedSize = chunks.reduce(
          (total, chunk) => total + chunk.emittedSize,
          0,
        );
        const totalJSSize = chunks.reduce(
          (total, chunk) => total + chunk.totalJSSize,
          0,
        );
        const unnecessarySize = sumModuleSizes(allUnnecessaryModules);
        const ratio = totalJSSize > 0 ? unnecessarySize / totalJSSize : 0;

        return {
          id: nodeIds.join('->') || `path_${index}`,
          label: nodeNames.join(' → '),
          nodeIds,
          nodeNames,
          edgeIds: getPathEdgeIds(nodeIds),
          chunkIds: chunks.map((chunk) => chunk.id),
          chunks,
          totalEmittedSize,
          totalJSSize,
          unnecessarySize,
          unnecessaryModuleCount: allUnnecessaryModules.length,
          ratio,
          severity: getPathSeverity(unnecessarySize, totalJSSize),
          topUnnecessaryModules: allUnnecessaryModules.slice(
            0,
            PATH_TOP_MODULE_LIMIT,
          ),
        } satisfies SDK.ChunkGroupGraphPathData;
      })
      .sort((a, b) => {
        if (a.unnecessarySize !== b.unnecessarySize) {
          return b.unnecessarySize - a.unnecessarySize;
        }
        if (a.ratio !== b.ratio) {
          return b.ratio - a.ratio;
        }
        return b.totalJSSize - a.totalJSSize;
      });

    const maxPathUnnecessarySize = Math.max(
      0,
      ...paths.map((path) => path.unnecessarySize),
    );
    const maxPathRatio = Math.max(0, ...paths.map((path) => path.ratio));
    const worstPathSeverity = paths.reduce<SDK.ChunkGroupGraphPathSeverity>(
      (current, path) =>
        getSeverityRank(path.severity) > getSeverityRank(current)
          ? path.severity
          : current,
      'normal',
    );

    return {
      ...node,
      incomingEdgeIds: incomingEdges.map((edge) => edge.id),
      outgoingEdgeIds: outgoingEdges.map((edge) => edge.id),
      incomingImports,
      paths,
      pathCount: paths.length,
      pathsTruncated: truncated,
      worstPathSeverity,
      maxPathUnnecessarySize,
      maxPathRatio,
      searchText: buildNodeSearchText(node, incomingImports),
    };
  });

  const priorityNodeIds = [...nodes]
    .sort((a, b) => {
      if (a.maxPathUnnecessarySize !== b.maxPathUnnecessarySize) {
        return b.maxPathUnnecessarySize - a.maxPathUnnecessarySize;
      }
      if (a.removableJSSize !== b.removableJSSize) {
        return b.removableJSSize - a.removableJSSize;
      }
      if (getSeverityRank(a.worstPathSeverity) !== getSeverityRank(b.worstPathSeverity)) {
        return getSeverityRank(b.worstPathSeverity) - getSeverityRank(a.worstPathSeverity);
      }
      if (a.maxPathRatio !== b.maxPathRatio) {
        return b.maxPathRatio - a.maxPathRatio;
      }
      if (a.totalEmittedSize !== b.totalEmittedSize) {
        return b.totalEmittedSize - a.totalEmittedSize;
      }
      return a.name.localeCompare(b.name);
    })
    .map((node) => node.id);

  const overview: SDK.ChunkGroupGraphOverviewData = {
    totalGroupCount: nodes.length,
    entryGroupCount: nodes.filter((node) => node.isInitial).length,
    asyncGroupCount: nodes.filter((node) => !node.isInitial).length,
    totalEdgeCount: enrichedEdges.length,
    removableGroupCount: nodes.filter((node) => node.removableJSSize > 0).length,
    warningGroupCount: nodes.filter(
      (node) => node.worstPathSeverity === 'warning',
    ).length,
    dangerGroupCount: nodes.filter(
      (node) => node.worstPathSeverity === 'danger',
    ).length,
    totalRemovableSize: nodes.reduce(
      (total, node) => total + node.removableJSSize,
      0,
    ),
    totalLocalRemovableSize: nodes.reduce(
      (total, node) => total + node.localRemovableJSSize,
      0,
    ),
    totalInheritedRemovableSize: nodes.reduce(
      (total, node) => total + node.inheritedRemovableJSSize,
      0,
    ),
    totalPathCount: nodes.reduce((total, node) => total + node.pathCount, 0),
    warningPathCount: nodes.reduce(
      (total, node) =>
        total +
        node.paths.filter((path) => path.severity === 'warning').length,
      0,
    ),
    dangerPathCount: nodes.reduce(
      (total, node) =>
        total +
        node.paths.filter((path) => path.severity === 'danger').length,
      0,
    ),
    truncatedPathGroupCount: nodes.filter((node) => node.pathsTruncated).length,
  };

  return {
    nodes,
    edges: enrichedEdges,
    overview,
    entryNodeIds,
    priorityNodeIds,
    pathLimit: CHUNK_GROUP_PATH_LIMIT,
  };
}
