import { Rule, SDK, Manifest, Constants } from '@rsdoctor/types';

import * as Loader from '../loader';
import * as Resolver from '../resolver';
import * as Plugin from '../plugin';
import * as Graph from '../graph';
import * as Alerts from '../alerts';
import { relative } from 'path';
import { checkSourceMapSupport } from '../rspack';

/**
 * this class will run at both browser and node environment.
 */
export class APIDataLoader {
  constructor(protected loader: Manifest.ManifestDataLoader) {
    this.loadAPI = this.loadAPI.bind(this);
  }

  public log(...args: unknown[]) {
    console.log(`[${this.constructor.name}]`, ...args);
  }

  public loadAPI<
    T extends SDK.ServerAPI.API,
    B extends
      SDK.ServerAPI.InferRequestBodyType<T> = SDK.ServerAPI.InferRequestBodyType<T>,
    R extends
      SDK.ServerAPI.InferResponseType<T> = SDK.ServerAPI.InferResponseType<T>,
  >(
    ...args: B extends void ? [api: T] : [api: T, body: B]
  ): Promise<SDK.ServerAPI.InferResponseType<T>> {
    const [api, body] = args;
    switch (api) {
      case SDK.ServerAPI.API.LoadDataByKey:
        return this.loader.loadData(
          (
            body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.LoadDataByKey>
          ).key,
        ) as Promise<R>;

      /** Project API */
      case SDK.ServerAPI.API.GetProjectInfo:
        return Promise.all([
          this.loader.loadData('root'),
          this.loader.loadData('pid'),
          this.loader.loadData('hash'),
          this.loader.loadData('summary'),
          this.loader.loadData('configs'),
          this.loader.loadData('envinfo'),
          this.loader.loadData('errors'),
        ]).then(
          ([root, pid, hash, summary, configs, envinfo, errors]) =>
            ({ root, pid, hash, summary, configs, envinfo, errors }) as R,
        );
      case SDK.ServerAPI.API.GetClientRoutes:
        if (
          typeof window !== 'undefined' &&
          window?.[Constants.WINDOW_RSDOCTOR_TAG]
        ) {
          return window[Constants.WINDOW_RSDOCTOR_TAG].enableRoutes;
        }
        return this.loader.loadManifest().then((res) => {
          const { enableRoutes = [] } = res.client || {};
          return enableRoutes as R;
        });

      /** Loader API */
      case SDK.ServerAPI.API.GetLoaderNames:
        return this.loader.loadData('loader').then((res) => {
          return Loader.getLoaderNames(res || []) as R;
        });

      case SDK.ServerAPI.API.GetLayers:
        return this.loader.loadData('moduleGraph').then((res) => {
          const { layers } = res || {};
          return layers as R;
        });

      case SDK.ServerAPI.API.GetLoaderChartData:
        return this.loader.loadData('loader').then((res) => {
          return Loader.getLoaderChartData(res || []) as R;
        });

      case SDK.ServerAPI.API.GetLoaderFileTree:
        return this.loader.loadData('loader').then((res) => {
          return Loader.getLoaderFileTree(res || []) as R;
        });

      case SDK.ServerAPI.API.GetLoaderFileDetails:
        return this.loader.loadData('loader').then((res) => {
          return Loader.getLoaderFileDetails(
            (
              body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetLoaderFileDetails>
            ).path,
            res || [],
          ) as R;
        });

      case SDK.ServerAPI.API.GetLoaderFolderStatistics:
        return this.loader.loadData('loader').then((res) => {
          return Loader.getLoaderFolderStatistics(
            (
              body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetLoaderFolderStatistics>
            ).folder,
            res || [],
          ) as R;
        });

      case SDK.ServerAPI.API.GetLoaderFileFirstInput:
        return this.loader.loadData('loader').then((res) => {
          return Loader.getLoaderFileFirstInput(
            (
              body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetLoaderFileFirstInput>
            ).file,
            res || [],
          ) as R;
        });

      case SDK.ServerAPI.API.GetLoaderFileInputAndOutput:
        return this.loader.loadData('loader').then((res) => {
          return Loader.getLoaderFileFirstInput(
            (
              body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetLoaderFileFirstInput>
            ).file,
            res || [],
          ) as R;
        });

      /** Resolver API */
      case SDK.ServerAPI.API.GetResolverFileTree:
        return this.loader.loadData('resolver').then((res) => {
          return Resolver.getResolverFileTree(res || []) as R;
        });
      case SDK.ServerAPI.API.GetResolverFileDetails:
        return Promise.all([
          this.loader.loadData('resolver'),
          this.loader.loadData('moduleGraph.modules'),
          this.loader.loadData('moduleCodeMap'),
        ]).then((res) => {
          const resolverData = res[0];
          const modules = res[1];
          const moduleCodeMap = res[2];

          return Resolver.getResolverFileDetails(
            (
              body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetResolverFileDetails>
            ).filepath,
            resolverData || [],
            modules || [],
            moduleCodeMap || {},
          ) as R;
        });

      /** Plugin API */
      case SDK.ServerAPI.API.GetPluginSummary:
        return this.loader.loadData('plugin').then((res) => {
          return Plugin.getPluginSummary(res || {}) as R;
        });
      case SDK.ServerAPI.API.GetPluginData:
        return this.loader.loadData('plugin').then((res) => {
          const { hooks, tapNames } =
            body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetPluginData>;
          return Plugin.getPluginData(res || {}, hooks, tapNames) as R;
        });

      /** Graph API */
      case SDK.ServerAPI.API.GetAssetsSummary:
        return this.loader.loadData('chunkGraph').then((res) => {
          const { withFileContent = true } =
            body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetAssetsSummary>;
          const { assets = [], chunks = [] } = res || {};
          return Graph.getAssetsSummary(assets, chunks, {
            withFileContent,
          }) as R;
        });
      case SDK.ServerAPI.API.GetAssetDetails:
        return Promise.all([
          this.loader.loadData('chunkGraph'),
          this.loader.loadData('moduleGraph'),
          this.loader.loadData('configs'),
        ]).then((res) => {
          const { assetPath } =
            body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetAssetDetails>;
          const configs = res[2] || [];
          const { isRspack, hasSourceMap } = checkSourceMapSupport(configs);
          const { assets = [], chunks = [] } = res[0] || {};
          const { modules = [] } = res[1] || {};
          const checkModules = (_module: SDK.ModuleData) => {
            // TODO: Cannot fully filter for now, because there are cases where sourcemap is missing or parsing failed, so filtering is not possible currently. Consider modifying the concatenated module tag identification later
            // if (module.size.parsedSize === 0) {
            //   return false;
            // }
            return true;
          };

          return Graph.getAssetDetails(
            assetPath,
            assets,
            chunks,
            modules,
            isRspack || hasSourceMap ? checkModules : () => true,
          ) as R;
        });

      case SDK.ServerAPI.API.GetSummaryBundles:
        return Promise.all([
          this.loader.loadData('chunkGraph'),
          this.loader.loadData('moduleGraph'),
          this.loader.loadData('configs'),
        ]).then((res) => {
          const { assets = [], chunks = [] } = res[0] || {};
          const { modules = [] } = res[1] || {};
          const configs = res[2] || [];

          // Filter out */template.js assets when config name is "lynx"
          let filteredAssets = assets;
          if (configs[0]?.config?.name === 'lynx') {
            filteredAssets = assets.filter(
              (asset) => !asset.path.endsWith('template.js'),
            );
          }

          return Graph.getAllBundleData(filteredAssets, chunks, modules, [
            'id',
            'path',
            'size',
            'kind',
          ]) as R;
        });

      case SDK.ServerAPI.API.GetChunksByModuleId:
        return Promise.all([
          this.loader.loadData('chunkGraph'),
          this.loader.loadData('moduleGraph'),
        ]).then((res) => {
          const { moduleId } =
            body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetChunksByModuleId>;
          const { chunks = [] } = res[0] || {};
          const { modules = [] } = res[1] || {};
          return Graph.getChunksByModuleId(moduleId, modules, chunks) as R;
        });
      case SDK.ServerAPI.API.GetModuleDetails:
        return Promise.all([
          this.loader.loadData('chunkGraph'),
          this.loader.loadData('moduleGraph'),
        ]).then((res) => {
          const { moduleId } =
            body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetModuleDetails>;
          const { modules = [], dependencies = [] } = res[1] || {};
          return Graph.getModuleDetails(moduleId, modules, dependencies) as R;
        });
      case SDK.ServerAPI.API.GetModulesByModuleIds:
        return this.loader.loadData('moduleGraph').then((res) => {
          const { moduleIds } =
            body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetModulesByModuleIds>;
          const { modules = [] } = res || {};
          return Graph.getModuleIdsByModulesIds(moduleIds, modules) as R;
        });

      case SDK.ServerAPI.API.GetEntryPoints:
        return Promise.all([this.loader.loadData('chunkGraph')]).then((res) => {
          const [chunkGraph] = res;
          const { entrypoints = [] } = chunkGraph || {};

          return Graph.getEntryPoints(entrypoints) as R;
        });

      case SDK.ServerAPI.API.GetModuleCodeByModuleId:
        return this.loader.loadData('moduleCodeMap').then((moduleCodeMap) => {
          const { moduleId } =
            body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetModuleCodeByModuleId>;
          if (moduleCodeMap) {
            return moduleCodeMap[moduleId] as R;
          }
          return { source: '', transformed: '', parsedSource: '' } as R;
        });

      case SDK.ServerAPI.API.GetModuleCodeByModuleIds:
        return this.loader.loadData('moduleCodeMap').then((moduleCodeMap) => {
          const { moduleIds } =
            body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetModuleCodeByModuleIds>;
          const _moduleCodeData = {} as R;
          if (moduleCodeMap) {
            moduleIds.forEach((id: number) => {
              (_moduleCodeData as Record<string, R>)[id] = moduleCodeMap[
                id
              ] as R;
            });
            return _moduleCodeData as R;
          }
          return [] as R;
        });

      case SDK.ServerAPI.API.GetAllModuleGraph:
        return this.loader.loadData('moduleGraph').then((moduleGraph) => {
          return moduleGraph?.modules as R;
        });

      case SDK.ServerAPI.API.GetSearchModules:
        return Promise.all([
          this.loader.loadData('moduleGraph'),
          this.loader.loadData('chunkGraph'),
        ]).then((res) => {
          const [moduleGraph, chunkGraph] = res as [
            SDK.ModuleGraphData,
            SDK.ChunkGraphData,
          ];
          const { moduleName } =
            body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetSearchModules>;
          if (!moduleName) return [] as R;

          const assetMap = chunkGraph.chunks.reduce(
            (acc, chunk) => {
              chunk.assets.forEach((asset) => {
                if (!acc[chunk.id]) {
                  acc[chunk.id] = [];
                }
                acc[chunk.id].push(asset);
              });
              return acc;
            },
            {} as Record<string, string[]>,
          );

          const searchedChunksMap = new Map();
          moduleGraph?.modules.filter((module) => {
            if (module.webpackId.includes(moduleName)) {
              module.chunks.forEach((chunk) => {
                if (searchedChunksMap.has(chunk)) {
                  return;
                }
                const assets = assetMap[chunk] || [];
                assets.forEach((asset) => {
                  if (asset.endsWith('.js')) {
                    searchedChunksMap.set(chunk, asset);
                  }
                });
              });
            }
          });
          return Object.fromEntries(searchedChunksMap) as R;
        });

      case SDK.ServerAPI.API.GetSearchModuleInChunk:
        return Promise.all([
          this.loader.loadData('moduleGraph'),
          this.loader.loadData('root'),
        ]).then((res) => {
          const [moduleGraph, root] = res as [SDK.ModuleGraphData, string];
          const { moduleName, chunk } =
            body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetSearchModuleInChunk>;
          if (!moduleName) return [] as R;

          const filteredModules = moduleGraph?.modules
            .filter(
              (module) =>
                module.webpackId.includes(moduleName) &&
                module.chunks.includes(chunk),
            )
            .map((filteredModule) => ({
              id: filteredModule.id,
              path: filteredModule.path,
              relativePath: relative(root, filteredModule.path),
            }));

          return filteredModules as R;
        });

      case SDK.ServerAPI.API.GetAllChunkGraph:
        return this.loader.loadData('chunkGraph').then((chunkGraph) => {
          return chunkGraph?.chunks as R;
        });

      case SDK.ServerAPI.API.GetPackageRelationAlertDetails:
        return Promise.all([
          this.loader.loadData('moduleGraph'),
          this.loader.loadData('errors'),
          this.loader.loadData('root'),
          this.loader.loadData('moduleCodeMap'),
        ]).then((res) => {
          const { id, target } =
            body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetPackageRelationAlertDetails>;
          const [moduleGraph, errors = [], root = '', moduleCodeMap] = res;
          const { modules = [], dependencies = [] } = moduleGraph || {};
          const { packages = [] } = (errors.find((e) => e.id === id) ||
            {}) as Rule.PackageRelationDiffRuleStoreData;

          const { dependencies: pkgDependencies = [] } =
            packages.find(
              (e) =>
                e.target.name === target.name &&
                e.target.root === target.root &&
                e.target.version === target.version,
            ) || {};

          return Alerts.getPackageRelationAlertDetails(
            modules,
            dependencies,
            root,
            pkgDependencies,
            moduleCodeMap || {},
          ) as R;
        });

      case SDK.ServerAPI.API.GetOverlayAlerts:
        return this.loader.loadData('errors').then((res) => {
          return (res || []).filter(
            (e) => e.code === Rule.RuleMessageCodeEnumerated.Overlay,
          ) as R;
        });

      /** Bundle Diff API */
      case SDK.ServerAPI.API.BundleDiffManifest:
        return this.loader.loadManifest() as Promise<R>;

      case SDK.ServerAPI.API.GetBundleDiffSummary:
        return Promise.all([
          this.loader.loadManifest(),
          this.loader.loadData('root'),
          this.loader.loadData('hash'),
          this.loader.loadData('errors'),
          this.loader.loadData('chunkGraph'),
          this.loader.loadData('moduleGraph'),
          this.loader.loadData('moduleCodeMap'),
          this.loader.loadData('packageGraph'),
          this.loader.loadData('configs'),
        ]).then(
          ([
            _manifest,
            root = '',
            hash = '',
            errors = {},
            chunkGraph = {},
            moduleGraph = {},
            moduleCodeMap = {},
            packageGraph = {},
            configs = [],
          ]) => {
            let outputFilename = '';

            // outputFile is user's repo build config: output.filename. Detail: https://webpack.docschina.org/configuration/output/#outputfilename.
            if (typeof configs[0]?.config?.output?.chunkFilename === 'string') {
              outputFilename = configs[0]?.config.output.chunkFilename;
            }

            return {
              root,
              hash,
              errors,
              chunkGraph,
              moduleGraph,
              packageGraph,
              outputFilename,
              moduleCodeMap,
            } as R;
          },
        );

      // This apis for AI
      case SDK.ServerAPI.API.GetChunkGraph:
        return this.loader.loadData('chunkGraph').then((res) => {
          const { chunks = [] } = res || {};
          return chunks as R;
        });

      case SDK.ServerAPI.API.GetAllModuleGraphFilter:
        return this.loader.loadData('moduleGraph').then((moduleGraph) => {
          return moduleGraph?.modules.map((m) => ({
            id: m.id,
            webpackId: m.webpackId,
            path: m.path,
            size: m.size,
            chunks: m.chunks,
            kind: m.kind,
          })) as R;
        });

      case SDK.ServerAPI.API.GetModuleByName:
        return this.loader.loadData('moduleGraph').then((moduleGraph) => {
          const { moduleName } =
            body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetModuleByName>;
          const { modules = [] } = moduleGraph || {};
          return (
            (modules
              .filter((m) => m.path.includes(moduleName))
              .map((m) => ({
                id: m.id,
                path: m.path,
              })) as R) || ([] as R)
          );
        });

      case SDK.ServerAPI.API.GetModuleIssuerPath:
        return this.loader.loadData('moduleGraph').then((moduleGraph) => {
          const { moduleId } =
            body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetModuleIssuerPath>;
          const modules = moduleGraph?.modules || [];
          const issuerPath =
            modules.find((m) => String(m.id) === moduleId)?.issuerPath || [];
          if (
            Array.isArray(issuerPath) &&
            issuerPath.length > 0 &&
            typeof issuerPath[0] === 'number'
          ) {
            return issuerPath
              .map((id) => modules.find((m) => m.id === id)?.path)
              .filter(Boolean) as R;
          }

          return issuerPath as R;
        });

      case SDK.ServerAPI.API.GetPackageInfo:
        return this.loader.loadData('packageGraph').then((packageGraph) => {
          return packageGraph?.packages as R;
        });

      case SDK.ServerAPI.API.GetPackageDependency:
        return this.loader.loadData('packageGraph').then((packageGraph) => {
          return (packageGraph?.dependencies || []) as R;
        });

      case SDK.ServerAPI.API.GetChunkGraphAI:
        return this.loader.loadData('chunkGraph').then((res) => {
          const { chunks = [] } = res || {};
          const filteredChunks = chunks.map(({ modules, ...rest }) => rest);
          return filteredChunks as R;
        });

      case SDK.ServerAPI.API.GetChunkByIdAI:
        return Promise.all([
          this.loader.loadData('chunkGraph'),
          this.loader.loadData('moduleGraph'),
        ]).then(([chunkGraph, moduleGraph]) => {
          const { chunks = [] } = chunkGraph || {};
          const { modules = [] } = moduleGraph || {};
          const { chunkId } =
            body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.GetChunkByIdAI>;
          const chunkInfo = chunks.find(
            (c) => c.id === chunkId,
          ) as SDK.ServerAPI.ExtendedChunkData;
          if (!chunkInfo) {
            return null as R;
          }
          const chunkModules = modules
            .filter((m) => chunkInfo.modules.includes(m.id))
            .map((module) => {
              return {
                id: module.id,
                path: module.path,
                size: module.size,
                chunks: module.chunks,
                kind: module.kind,
                issuerPath: module.issuerPath,
              };
            });
          chunkInfo.modulesInfo = chunkModules;
          return chunkInfo as R;
        });

      case SDK.ServerAPI.API.GetDirectoriesLoaders:
        return Promise.all([
          this.loader.loadData('root'),
          this.loader.loadData('loader'),
        ]).then(([root, loaders]) => {
          return Loader.getDirectoriesLoaders(loaders || [], root || '') as R;
        });

      default:
        throw new Error(`API not implement: "${api}"`);
    }
  }
}
