import type { SourceMapConsumer } from 'source-map';
import * as Webpack from 'webpack';
import * as Rspack from '@rspack/core';
import { File } from '@rsdoctor/utils/build';
import { Node } from '@rsdoctor/utils/ruleUtils';
import { Plugin, SDK } from '@rsdoctor/types';
import {
  getAllModules,
  getDependencyPosition,
  getDependencyRequest,
  getModuleId,
  isExternalModule,
} from '@/build-utils/common/webpack/compatible';
import {
  getImportKind,
  isImportDependency,
  removeNoImportStyle,
} from '@/build-utils/common/module-graph';
import { hasSetEsModuleStatement } from '../parser';
import { isFunction } from 'lodash';
import { IDependency, IModuleGraph, INormalModule } from '@/types';
import { Dependency } from 'node_modules/@rspack/core/dist/Dependency';
import ModuleGraph from 'node_modules/@rspack/core/dist/ModuleGraph';

type BaseNormalModule = Webpack.NormalModule | Rspack.NormalModule;

export interface TransformContext {
  astCache?: Map<BaseNormalModule, Node.Program>;
  packagePathMap?: Map<string, string>;
  getSourceMap?(module: string): Promise<SourceMapConsumer | undefined>;
}

type WebpackFs = Webpack.Compilation['fileSystemInfo'];
type RspackFs = Rspack.Compilation['fileSystemInfo'];

async function readFile(target: string, wbFs: WebpackFs | RspackFs) {
  if ('fs' in wbFs && wbFs?.fs?.readFile) {
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

  return File.fse.readFile(target).catch(() => {});
}

/**
 * Get the type of dependencies between modules.
 * This property can determine what runtime webpack has added to the modules.
 */
export function getModuleExportsType(
  module: INormalModule,
  moduleGraph?: IModuleGraph,
  strict = false,
): SDK.DependencyBuildMeta['exportsType'] {
  // webpack 5
  // https://github.com/webpack/webpack/blob/v5.75.0/lib/RuntimeTemplate.js#L771
  if (moduleGraph && 'getExportsType' in module) {
    return 'getExportsType' in module
      ? module.getExportsType(moduleGraph as Webpack.ModuleGraph, strict)
      : 'default-with-named';
  }
  // Rspack does not support `getExportsType` yet.
  return strict ? 'default-with-named' : 'dynamic';
}

function appendDependency(
  dep: IDependency,
  module: SDK.ModuleInstance,
  builderGraph: IModuleGraph,
  graph: SDK.ModuleGraphInstance,
) {
  // Rspack does not support `getResolvedModule` yet.
  const resolvedWebpackModule =
    'weak' in dep
      ? ((builderGraph as Webpack.ModuleGraph).getResolvedModule(
          dep as Webpack.Dependency,
        ) as Webpack.NormalModule)
      : ((builderGraph as ModuleGraph).getResolvedModule(
          dep as Dependency,
        ) as Rspack.NormalModule);

  if (!resolvedWebpackModule) {
    return;
  }

  const rawRequest = getDependencyRequest(
    dep,
    resolvedWebpackModule as INormalModule | undefined,
  );
  const resolveRequest = getModuleId(resolvedWebpackModule);
  const request = rawRequest ?? resolveRequest;

  if (!module.getDependencyByRequest(request)) {
    const depModule = graph.getModuleByFile(resolveRequest);

    if (depModule) {
      const _dep = module.addDependency(request, depModule, getImportKind(dep));

      if (_dep) {
        graph.addDependency(_dep);
      }
    }
  }

  const dependency = module.getDependencyByRequest(request);

  if (dependency) {
    dependency.setBuildMeta({
      exportsType: getModuleExportsType(
        resolvedWebpackModule,
        builderGraph,
        module.meta.strictHarmonyModule,
      ),
    });

    const statement = getDependencyPosition(dep, module, false);

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
    }
  }

  return process.env.NODE_ENV === 'test'
    ? Buffer.from('test code')
    : readFile(modulePath, wbFs);
}

async function appendModuleData(
  origin: INormalModule,
  webpackGraph: IModuleGraph,
  graph: SDK.ModuleGraphInstance,
  wbFs: WebpackFs,
  features?: Plugin.RsdoctorWebpackPluginFeatures,
  context?: TransformContext,
) {
  const module = graph.getModuleByWebpackId(getModuleId(origin));

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

    const transformed = isExternalModule(origin)
      ? ''
      : module.getSource().transformed.length > 0
        ? module.getSource().transformed
        : isFunction(origin?.originalSource)
          ? (origin.originalSource()?.source()?.toString() ?? '')
          : '';
    const transformedSize = isExternalModule(origin)
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
          const realpath = await File.fse.realpath(root);
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
        .filter((item) => isImportDependency(item))
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
    const allModules = getAllModules(webpackCompilation);

    await Promise.all(
      allModules.map((module: INormalModule) => {
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

    removeNoImportStyle(graph);
    return graph;
  } catch (e) {
    return graph;
  }
}
