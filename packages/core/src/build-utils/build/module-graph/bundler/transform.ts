import type { SourceMapConsumer } from 'source-map';
import fs from 'node:fs';
import type {
  Compilation,
  Dependency,
  ModuleGraph,
  NormalModule,
} from '@rspack/core';
import { Node } from '@rsdoctor/utils/ruleUtils';
import { Plugin, SDK } from '@rsdoctor/types';
import { ModuleGraphTrans, Bundler as BundlerGraph } from '@rsdoctor/graph';
import { hasSetEsModuleStatement } from '../parser';
import { logger } from '@rsdoctor/utils/logger';

export interface TransformContext {
  astCache?: Map<NormalModule, Node.Program>;
  packagePathMap?: Map<string, string>;
  getSourceMap?(module: string): Promise<SourceMapConsumer | undefined>;
}

async function readFile(target: string) {
  try {
    return await fs.promises.readFile(target);
  } catch {
    logger.debug(`readFile error: ${target}`);
    return;
  }
}

/**
 * Get the type of dependencies between modules.
 * This property can determine what runtime metadata the bundler adds to modules.
 */
export function getModuleExportsType(
  strict = false,
): SDK.DependencyBuildMeta['exportsType'] {
  return strict ? 'default-with-named' : 'dynamic';
}

function appendDependency(
  bundlerDep: Dependency,
  module: SDK.ModuleInstance,
  bundlerGraph: ModuleGraph,
  graph: SDK.ModuleGraphInstance,
) {
  // Rspack does not support `getResolvedModule` yet.
  const resolvedBundlerModule = bundlerGraph?.getResolvedModule
    ? (bundlerGraph.getResolvedModule(bundlerDep) as NormalModule)
    : undefined;

  if (!resolvedBundlerModule) {
    return;
  }

  const rawRequest = BundlerGraph.getBundlerDependencyRequest(
    bundlerDep,
    resolvedBundlerModule,
  );
  const resolveRequest = BundlerGraph.getBundlerModulePath(
    resolvedBundlerModule,
  );
  const request = rawRequest ?? resolveRequest;

  if (!module.getDependencyByRequest(request)) {
    const depLayer = resolvedBundlerModule.layer || undefined;
    const depModule = graph.getModuleByFile(resolveRequest, depLayer)[0];

    if (depModule) {
      const dep = module.addDependency(
        request,
        depModule,
        ModuleGraphTrans.getImportKind(bundlerDep),
      );

      if (dep) {
        graph.addDependency(dep);
      }
    }
  }

  const dependency = module.getDependencyByRequest(request);

  if (dependency) {
    dependency.setBuildMeta({
      exportsType: getModuleExportsType(module.meta.strictHarmonyModule),
    });

    const statement = BundlerGraph.getDependencyPosition(
      bundlerDep,
      module,
      false,
    );

    if (statement) {
      dependency.addStatement(statement);
    }

    // Update statement position.
    dependency.statements.forEach((state) => {
      state.position.source = state.module.getSourceRange(
        state.position.transformed,
      );
    });
  }
}

function getModuleSource(modulePath: string, sourceMap?: SourceMapConsumer) {
  if (sourceMap) {
    try {
      const contentFromSourceMap = sourceMap.sourceContentFor(modulePath);

      if (contentFromSourceMap) {
        return Buffer.from(contentFromSourceMap);
      }
    } catch (e) {
      // ..
      logger.debug(`getModuleSource error: ${e}`);
    }
  }

  return readFile(modulePath);
}

async function appendModuleData(
  origin: NormalModule,
  bundlerGraph: ModuleGraph,
  graph: SDK.ModuleGraphInstance,
  features?: Plugin.RsdoctorPluginFeatures,
  context?: TransformContext,
) {
  const module = graph.getModuleByIdentifier(
    BundlerGraph.getBundlerModuleId(origin),
  );

  if (!origin || !module) {
    return;
  }

  const { getSourceMap, astCache, packagePathMap } = context ?? {};

  try {
    const sourceMap = await getSourceMap?.(module.path);
    const source =
      (await getModuleSource(module.path, sourceMap)) ?? Buffer.from('');

    if (sourceMap) {
      module.setSourceMap(sourceMap);
    }

    if (astCache?.has(origin)) {
      const program = astCache.get(origin)!;
      module.setProgram(program);
      module.meta.hasSetEsModuleStatement = hasSetEsModuleStatement(program);
    }

    const transformed = BundlerGraph.isExternalModule(origin)
      ? ''
      : module.getSource().transformed.length > 0
        ? module.getSource().transformed
        : BundlerGraph.getModuleSource(origin);
    const transformedSize = BundlerGraph.isExternalModule(origin)
      ? 0
      : module.getSize().transformedSize > 0
        ? module.getSize().transformedSize
        : Buffer.from(transformed).byteLength;

    module.setSource({
      transformed,
      source: source.toString(),
    });

    module.setSize({
      transformedSize,
      sourceSize: source.byteLength,
    });

    let packageData: SDK.PackageData | undefined;

    const resourceResolveData = origin.resourceResolveData as
      | {
          descriptionFileRoot?: string;
          descriptionFileData?: SDK.PackageData;
        }
      | undefined;

    if (packagePathMap && resourceResolveData) {
      let { descriptionFileRoot: root } = resourceResolveData;
      const { descriptionFileData: data } = resourceResolveData;

      if (root && data && data.name && data.version) {
        if (packagePathMap.has(root)) {
          root = packagePathMap.get(root)!;
        } else {
          const realpath = await fs.promises.realpath(root, {
            encoding: 'utf-8',
          });
          root = realpath;
          packagePathMap.set(root, realpath);
        }

        packageData = {
          ...resourceResolveData.descriptionFileData,
          root,
        } as SDK.PackageData;
      }
    }

    module.meta.strictHarmonyModule =
      origin.buildMeta?.strictHarmonyModule ?? false;
    module.meta.packageData = packageData;

    if (!features?.lite && origin?.dependencies) {
      // lite bundle Mode don't have dependency；
      // Record dependent data.
      Array.from(origin.dependencies)
        // Filter self-dependence and empty dependencies.
        .filter((item) => ModuleGraphTrans.isImportDependency(item))
        // Merge asynchronous dependencies.
        .concat(
          origin.blocks.reduce(
            (ans, item) => ans.concat(item.dependencies),
            [] as Dependency[],
          ),
        )
        // Record dependent data.
        .forEach((dep) => appendDependency(dep, module, bundlerGraph, graph));
    }
  } catch (e) {
    console.error(`module ${module.path} transform has error:`, e);
  }
}

export async function appendModuleGraphByCompilation(
  compilation: Plugin.BaseCompilation,
  graph: SDK.ModuleGraphInstance,
  features?: Plugin.RsdoctorPluginFeatures,
  context?: TransformContext,
) {
  try {
    const bundlerCompilation = compilation as unknown as Compilation;
    const { moduleGraph: bundlerGraph } = bundlerCompilation;
    const allModules = BundlerGraph.getAllModules(bundlerCompilation);

    await Promise.all(
      allModules.map((module: NormalModule) => {
        return appendModuleData(module, bundlerGraph, graph, features, context);
      }),
    );

    ModuleGraphTrans.removeNoImportStyle(graph);
    return graph;
  } catch {
    return graph;
  }
}
