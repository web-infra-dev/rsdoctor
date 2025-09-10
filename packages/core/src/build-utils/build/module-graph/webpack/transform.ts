import type { SourceMapConsumer } from 'source-map';
import fs from 'node:fs';
import * as Webpack from 'webpack';
import * as Rspack from '@rspack/core';
import { Node } from '@rsdoctor/utils/ruleUtils';
import { Plugin, SDK } from '@rsdoctor/types';
import { ModuleGraphTrans, Webpack as WebpackGraph } from '@rsdoctor/graph';
import { hasSetEsModuleStatement } from '../parser';
import { isFunction } from 'lodash-es';
import { logger } from '@rsdoctor/utils/logger';

export interface TransformContext {
  astCache?: Map<Webpack.NormalModule, Node.Program>;
  packagePathMap?: Map<string, string>;
  getSourceMap?(module: string): Promise<SourceMapConsumer | undefined>;
}

type WebpackFs = Webpack.Compilation['fileSystemInfo'];

async function readFile(target: string, wbFs: WebpackFs) {
  if (wbFs?.fs?.readFile) {
    const result = new Promise<Buffer | void>((resolve, reject) => {
      wbFs.fs.readFile(target, (err, content) => {
        if (err) {
          reject(err);
          return;
        }

        if (content) {
          resolve(Buffer.from(content));
        } else {
          resolve();
        }
      });
    }).catch(() => {});

    if (result) {
      return result;
    }
  }

  try {
    return await fs.promises.readFile(target);
  } catch {
    // Swallow errors to match the .catch(() => {}) above
    logger.debug(`readFile error: ${target}`);
    return;
  }
}

/**
 * Get the type of dependencies between modules.
 * This property can determine what runtime webpack has added to the modules.
 */
export function getModuleExportsType(
  module: Webpack.NormalModule | Rspack.NormalModule,
  moduleGraph?: Webpack.ModuleGraph,
  strict = false,
): SDK.DependencyBuildMeta['exportsType'] {
  // webpack 5
  // https://github.com/webpack/webpack/blob/v5.75.0/lib/RuntimeTemplate.js#L771
  if (moduleGraph && 'getExportsType' in module) {
    return module.getExportsType(moduleGraph, strict);
  }
  // Rspack does not support `getExportsType` yet.
  return strict ? 'default-with-named' : 'dynamic';
}

function appendDependency(
  webpackDep: Webpack.Dependency,
  module: SDK.ModuleInstance,
  webpackGraph: Webpack.ModuleGraph,
  graph: SDK.ModuleGraphInstance,
) {
  // Rspack does not support `getResolvedModule` yet.
  const resolvedWebpackModule = webpackGraph?.getResolvedModule
    ? (webpackGraph.getResolvedModule(webpackDep) as Webpack.NormalModule)
    : undefined;

  if (!resolvedWebpackModule) {
    return;
  }

  const rawRequest = WebpackGraph.getWebpackDependencyRequest(
    webpackDep,
    resolvedWebpackModule,
  );
  const resolveRequest = WebpackGraph.getWebpackModulePath(
    resolvedWebpackModule,
  );
  const request = rawRequest ?? resolveRequest;

  if (!module.getDependencyByRequest(request)) {
    const depModule = graph.getModuleByFile(resolveRequest);

    if (depModule) {
      const dep = module.addDependency(
        request,
        depModule,
        ModuleGraphTrans.getImportKind(webpackDep),
      );

      if (dep) {
        graph.addDependency(dep);
      }
    }
  }

  const dependency = module.getDependencyByRequest(request);

  if (dependency) {
    dependency.setBuildMeta({
      exportsType: getModuleExportsType(
        resolvedWebpackModule,
        webpackGraph,
        module.meta.strictHarmonyModule,
      ),
    });

    const statement = WebpackGraph.getDependencyPosition(
      webpackDep,
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

function getModuleSource(
  modulePath: string,
  wbFs: WebpackFs,
  sourceMap?: SourceMapConsumer,
) {
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

  return readFile(modulePath, wbFs);
}

async function appendModuleData(
  origin: Webpack.NormalModule,
  webpackGraph: Webpack.ModuleGraph,
  graph: SDK.ModuleGraphInstance,
  wbFs: WebpackFs,
  features?: Plugin.RsdoctorWebpackPluginFeatures,
  context?: TransformContext,
) {
  const module = graph.getModuleByWebpackId(
    WebpackGraph.getWebpackModuleId(origin),
  );

  if (!origin || !module) {
    return;
  }

  const { getSourceMap, astCache, packagePathMap } = context ?? {};

  try {
    const sourceMap = await getSourceMap?.(module.path);
    const source =
      (await getModuleSource(module.path, wbFs, sourceMap)) ?? Buffer.from('');

    if (sourceMap) {
      module.setSourceMap(sourceMap);
    }

    if (astCache?.has(origin)) {
      const program = astCache.get(origin)!;
      module.setProgram(program);
      module.meta.hasSetEsModuleStatement = hasSetEsModuleStatement(program);
    }

    const transformed = WebpackGraph.isExternalModule(origin)
      ? ''
      : module.getSource().transformed.length > 0
        ? module.getSource().transformed
        : isFunction(origin?.originalSource)
          ? (origin.originalSource()?.source()?.toString() ?? '')
          : '';
    const transformedSize = WebpackGraph.isExternalModule(origin)
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

    if (packagePathMap && origin.resourceResolveData) {
      let { descriptionFileRoot: root } = origin.resourceResolveData;
      const { descriptionFileData: data } = origin.resourceResolveData;

      if (root && data.name && data.version) {
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
          ...origin.resourceResolveData.descriptionFileData,
          root,
        };
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
            [] as Webpack.Dependency[],
          ),
        )
        // Record dependent data.
        .forEach((dep) => appendDependency(dep, module, webpackGraph, graph));
    }
  } catch (e) {
    console.error(`module ${module.path} transform has error:`, e);
  }
}

export async function appendModuleGraphByCompilation(
  compilation: Plugin.BaseCompilation,
  graph: SDK.ModuleGraphInstance,
  features?: Plugin.RsdoctorWebpackPluginFeatures,
  context?: TransformContext,
) {
  try {
    // Only webpack will execute the following logic.
    const webpackCompilation = compilation as unknown as Webpack.Compilation;
    const { moduleGraph: webpackGraph, fileSystemInfo } = webpackCompilation;
    const allModules = WebpackGraph.getAllModules(webpackCompilation);

    await Promise.all(
      allModules.map((module: Webpack.NormalModule) => {
        return appendModuleData(
          module,
          webpackGraph,
          graph,
          fileSystemInfo,
          features,
          context,
        );
      }),
    );

    ModuleGraphTrans.removeNoImportStyle(graph);
    return graph;
  } catch (e) {
    return graph;
  }
}
