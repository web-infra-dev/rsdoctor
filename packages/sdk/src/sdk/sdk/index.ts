import fs from 'node:fs';
import path from 'path';
import { createRequire } from 'module';
import { DevToolError } from '@rsdoctor/utils/error';
import { Common, Constants, Manifest, SDK } from '@rsdoctor/types';
import { File } from '@rsdoctor/utils/build';
import { RawSourceMap, SourceMapConsumer } from 'source-map';
import { ModuleGraph, ChunkGraph, PackageGraph } from '@rsdoctor/graph';
import { logger } from '@rsdoctor/utils/logger';
import { RsdoctorServer } from '../server';
import { RsdoctorFakeServer } from '../server/fakeServer';
import { RsdoctorWebpackSDKOptions } from './types';
import { SDKCore } from './core';
import { Algorithm } from '@rsdoctor/utils/common';
import { Lodash } from '@rsdoctor/utils/common';
import { findRoot } from '../utils';

const require = createRequire(import.meta.url);
const jc = require('json-cycle');

export * from '../utils/openBrowser';
export * from '../utils/base';

export class RsdoctorSDK<
    T extends RsdoctorWebpackSDKOptions = RsdoctorWebpackSDKOptions,
  >
  extends SDKCore<T>
  implements SDK.RsdoctorBuilderSDKInstance
{
  public server: RsdoctorServer;

  public extraConfig: SDK.SDKOptionsType | undefined;

  public type: SDK.ToDataType;

  public _root: string;

  private _summary: SDK.SummaryData = { costs: [] };

  private _configs: SDK.ConfigData = [];

  private _errors: DevToolError[] = [];

  private _loader: SDK.LoaderData = [];

  private _loaderStart: SDK.LoaderData = [];

  private _resolver: SDK.ResolverData = [];

  private _plugin: SDK.PluginData = {};

  private _moduleGraph: SDK.ModuleGraphInstance = new ModuleGraph();

  private _chunkGraph: SDK.ChunkGraphInstance = new ChunkGraph();

  private _rawSourceMapCache = new Map<string, RawSourceMap>();

  private _sourceMap = new Map<string, SourceMapConsumer>();

  private _packageGraph!: SDK.PackageGraphInstance;

  constructor(options: T) {
    super(options);
    this.server = options.config?.noServer
      ? new RsdoctorFakeServer(this, undefined)
      : new RsdoctorServer(this, options.port, {
          innerClientPath: options.config?.innerClientPath || '',
          printServerUrl: options.config?.printLog?.serverUrls,
        });
    this.type = Lodash.isNumber(options.type)
      ? options.type
      : SDK.ToDataType.Normal;
    this.extraConfig = options.config;
    this._root = findRoot() ?? '';
  }

  async bootstrap() {
    logger.debug(`${Date.now()}`, '[RsdoctorSDK][bootstrap start]');
    this.server && (await this.server.bootstrap());
    await super.bootstrap();
    logger.debug(
      `${Date.now()} ${this.server.origin}`,
      '[RsdoctorSDK][bootstrap end]',
    );
  }

  async dispose() {
    logger.debug(`${Date.now()}`, '[RsdoctorSDK][dispose start]');
    this.server && (await this.server.dispose());
    await super.dispose();
    logger.debug(`${Date.now()}`, '[RsdoctorSDK][dispose end]');
  }

  async applyErrorFix(id: number) {
    const { _errors: errors } = this;
    const error = errors.find((err) => err.id === id);

    if (!error || !error.path || !error.fixData || error.fixData.isFixed) {
      return;
    }

    const { path: filePath, fixData } = error;
    const sameFileErrors = errors.filter(
      (item) => item.path === filePath && item !== error,
    );
    let content = (await fs.promises.readFile(filePath, 'utf-8')).toString();

    // Application of current modification.
    const startTxt = content.substring(0, fixData.start);
    const endTxt = content.substring(fixData.end, content.length);
    const offset =
      (fixData.newText ?? '').length - (fixData.end - fixData.start);

    // Modified text.
    content = startTxt + fixData.newText + endTxt;

    // The remaining modifications of the same document need to be recalculated.
    for (const other of sameFileErrors) {
      const { fixData: otherFixData } = other;

      if (!otherFixData) {
        continue;
      }

      // After the modified text, the offset needs to be corrected.
      if (otherFixData.start >= fixData.end) {
        otherFixData.start += offset;
        otherFixData.end += offset;
      }
    }

    // Modify the write to the hard disk.
    await fs.promises.writeFile(filePath, content);
  }

  clear() {
    this._errors = [];
    this._loader = [];
    this._resolver = [];
    this._plugin = {};
    this._moduleGraph = new ModuleGraph();
    this._chunkGraph = new ChunkGraph();
  }

  clearSourceMapCache(): void {
    this._rawSourceMapCache = new Map();
    this._sourceMap = new Map();
  }

  async getSourceMap(file: string): Promise<SourceMapConsumer | undefined> {
    const { _sourceMap: sourceMap, _rawSourceMapCache: rawMap } = this;

    if (sourceMap.has(file)) {
      return sourceMap.get(file)!;
    }

    const rawData = rawMap.get(file);

    // There is no data, or illegal data.
    if (
      !rawData ||
      rawData.version < 0 ||
      !rawData.sourcesContent?.[0] ||
      !rawData.mappings
    ) {
      return Promise.resolve(undefined);
    }

    try {
      const result = await new SourceMapConsumer(rawData);
      sourceMap.set(file, result);
      return result;
    } catch (e) {
      // TODO: Specific errors need to be checked.
      return Promise.resolve(undefined);
    }
  }

  reportSourceMap(data: RawSourceMap): void {
    this._rawSourceMapCache.set(data.file, data);
  }

  reportConfiguration(config: SDK.ConfigData[0]) {
    config.root ??= this._root;
    this._configs.push(config);
    this.onDataReport();
  }

  reportError(errors: Error[]) {
    errors.forEach((item) => {
      this._errors.push(
        DevToolError.from(item, {
          code: this.name,
        }),
      );
    });
    this.onDataReport();
  }

  reportLoader(data: SDK.LoaderData) {
    data.forEach((item) => {
      if (this.extraConfig?.mode === SDK.IMode[SDK.IMode.brief]) {
        item.loaders.forEach((_loader) => {
          _loader.input = undefined;
          _loader.result = undefined;
        });
      }

      // find by resource.path
      let match = this._loader.find(
        (e) => e.resource.path === item.resource.path,
      );
      if (match) {
        match.loaders.push(...item.loaders);
      } else {
        match = item;
        this._loader.push(item);
      }

      match.loaders.sort((a, b) => {
        // default sort by call timestamp
        if (a.startAt !== b.startAt) {
          return a.startAt - b.startAt;
        }

        if (a.isPitch) {
          if (b.isPitch) {
            return a.loaderIndex - b.loaderIndex;
          }
          // [a, b]
          return -1;
        }

        if (b.isPitch) {
          // [b, a]
          return 1;
        }

        return b.loaderIndex - a.loaderIndex;
      });
    });
    this.onDataReport();
  }

  reportLoaderStartOrEnd(data: SDK.ResourceLoaderData) {
    // Just one loader data in array list.
    const _builtinLoader = data.loaders[0];
    if (_builtinLoader.startAt) {
      this._loaderStart.push(data);
    } else if (_builtinLoader.endAt) {
      const matchLoaderStart = this._loaderStart.find(
        (e) =>
          e.resource.path === data.resource.path &&
          e.loaders[0].loader === _builtinLoader.loader,
      );

      if (matchLoaderStart) {
        matchLoaderStart.loaders[0].result = _builtinLoader.result;
        matchLoaderStart.loaders[0].endAt = _builtinLoader.endAt;
        this.reportLoader([matchLoaderStart]);
      }
    }
  }

  reportResolver(data: SDK.ResolverData): void {
    data.forEach((item) => this._resolver.push(item));
    this.onDataReport();
  }

  reportPlugin(data: SDK.PluginData): void {
    Object.keys(data).forEach((hook) => {
      if (!this._plugin[hook]) {
        this._plugin[hook] = data[hook];
      } else {
        data[hook].forEach((item) => {
          this._plugin[hook].push(item || undefined);
        });
      }
    });
    this.onDataReport();
  }

  reportModuleGraph(data: SDK.ModuleGraphInstance): void {
    logger.debug(`data size: ${data.size()}`, '[SDK.reportModuleGraph][start]');
    this._moduleGraph.fromInstance(data as ModuleGraph);
    this.createPackageGraph();
    this.onDataReport();
    logger.debug(
      `sdk._moduleGraph size: ${this._moduleGraph.size()}`,
      '[SDK reportModuleGraph][end]',
    );
  }

  reportPackageGraph(data: SDK.PackageGraphInstance): void {
    logger.debug('[SDK.reportPackageGraph][start]');
    if (!this._packageGraph) {
      this._packageGraph = data;
    }
    this.onDataReport();
    logger.debug(
      `sdk._moduleGraph size: ${this._moduleGraph.size()}`,
      '[SDK reportPackageGraph][end]',
    );
  }

  reportChunkGraph(data: SDK.ChunkGraphInstance): void {
    this._chunkGraph.addAsset(...data.getAssets());
    this._chunkGraph.addChunk(...data.getChunks());
    this._chunkGraph.addEntryPoint(...data.getEntryPoints());
    this.onDataReport();
  }

  reportSummaryData(part: Partial<SDK.SummaryData>): void {
    const keys = ['costs'] as Array<keyof SDK.SummaryData>;

    for (const key of keys) {
      const v = part[key];
      if (!v) continue;
      if (typeof v === 'object') {
        if (Array.isArray(v)) {
          (this._summary[key] as unknown[]) = [
            ...((this._summary[key] as Array<any>) || []),
            ...v,
          ];
        } else {
          (this._summary[key] as Common.PlainObject) = {
            ...((this._summary[key] as Common.PlainObject) || {}),
            ...(v as Common.PlainObject),
          };
        }
      } else {
        (this._summary[key] as unknown) = v;
      }
    }

    this.onDataReport();
  }

  createPackageGraph() {
    logger.debug(
      `sdk._moduleGraph size: ${this._moduleGraph.size()}`,
      '[SDK.createPackageGraph][start]',
    );
    if (!this._packageGraph) {
      const pkgGraph = PackageGraph.fromModuleGraph(
        this._moduleGraph,
        this.root,
        (path: string) => {
          try {
            const exists = fs.existsSync(path);
            if (exists) {
              // TODO: it's too much logs, this needs to be optimized
              // logger.debug(
              //   `sdk.PackageGraph package.json exists: ${exists}, path: ${path}`,
              //   '[SDK.createPackageGraph][load]',
              // );
              return File.fse.readJSONSync(path);
            }
          } catch (error) {
            const { message, stack } = error as Error;
            logger.debug(
              () =>
                `sdk.createPackageGraph error, path: ${path}, error message: ${
                  stack || message
                }`,
              '[SDK.createPackageGraph][error]',
            );
          }
        },
      );
      this._packageGraph = pkgGraph;
      logger.debug(
        `sdk._packageGraph packages: ${
          this._packageGraph.getPackages().length
        }`,
        '[SDK.createPackageGraph][end]',
      );
    }
  }

  public async writeStore(options?: SDK.WriteStoreOptionsType) {
    logger.debug(`sdk.writeStore has run.`, '[SDK.writeStore][end]');
    let htmlPath = '';
    if (this.extraConfig?.mode === SDK.IMode[SDK.IMode.brief]) {
      const clientHtmlPath = this.extraConfig.innerClientPath
        ? this.extraConfig.innerClientPath
        : require.resolve('@rsdoctor/client');

      if (this.extraConfig?.brief?.type?.includes('json')) {
        const jsonData = this.getStoreData();
        fs.mkdirSync(this.outputDir, { recursive: true });
        fs.writeFileSync(
          path.resolve(this.outputDir, 'rsdoctor-data.json'),
          JSON.stringify(jsonData, null, 2),
        );
      }
      if (this.extraConfig.brief?.type?.includes('html')) {
        htmlPath = this.inlineScriptsAndStyles(clientHtmlPath);
      }
      return htmlPath;
    }
    return this.saveManifest(this.getStoreData(), options || {});
  }

  public getStoreData(): SDK.BuilderStoreData {
    const ctx = this;
    const briefOptions = this.extraConfig?.brief;
    const sections = briefOptions?.jsonOptions?.sections;
    const isJsonType = briefOptions?.type?.includes('json');

    return {
      get hash() {
        return ctx.hash;
      },
      get root() {
        return ctx.root;
      },
      get envinfo() {
        return ctx._envinfo;
      },
      get pid() {
        return ctx.pid;
      },
      get errors() {
        // In brief mode with sections control, check if rules section is enabled
        if (isJsonType && sections && !sections.rules) {
          return [];
        }
        return ctx._errors.map((err) => err.toData());
      },
      get configs() {
        return ctx._configs.slice();
      },
      get summary() {
        return { ...ctx._summary };
      },
      get resolver() {
        return ctx._resolver.slice();
      },
      get loader() {
        return ctx._loader.slice();
      },
      get moduleGraph() {
        // In brief mode with sections control, check if moduleGraph section is enabled
        if (isJsonType && sections && !sections.moduleGraph) {
          return {
            dependencies: [],
            modules: [],
            moduleGraphModules: [],
            exports: [],
            sideEffects: [],
            variables: [],
            layers: [],
          };
        }
        return ctx._moduleGraph.toData({
          contextPath: ctx._configs?.[0]?.config?.context || '',
          briefOptions,
        });
      },
      get chunkGraph() {
        // In brief mode with sections control, check if chunkGraph section is enabled
        if (isJsonType && sections && !sections.chunkGraph) {
          return {
            assets: [],
            chunks: [],
            entrypoints: [],
          };
        }
        return ctx._chunkGraph.toData(ctx.type);
      },
      get moduleCodeMap() {
        if (ctx.extraConfig?.mode === SDK.IMode[SDK.IMode.brief]) {
          return {};
        }
        return ctx._moduleGraph.toCodeData(ctx.type);
      },
      get plugin() {
        return { ...ctx._plugin };
      },
      get packageGraph() {
        return ctx._packageGraph
          ? ctx._packageGraph.toData()
          : {
              packages: [],
              dependencies: [],
            };
      },
      get otherReports() {
        return { treemapReportHtml: '' };
      },
    };
  }

  public getManifestData(): Manifest.RsdoctorManifestWithShardingFiles {
    const dataValue = this.getStoreData();
    const data: Manifest.RsdoctorManifestWithShardingFiles = {
      client: {
        enableRoutes: this.getClientRoutes(),
      },
      data: Object.keys(dataValue).reduce((t, e) => {
        const _e = e as keyof SDK.BuilderStoreData;
        if (dataValue[_e] && typeof dataValue[_e] === 'object') {
          t[e] = [
            `${this.server.origin}${SDK.ServerAPI.API.LoadDataByKey}/${e}`,
          ];
        } else {
          t[e] = dataValue[_e];
        }

        return t;
      }, {} as Common.PlainObject) as unknown as Manifest.RsdoctorManifestWithShardingFiles['data'],
      __LOCAL__SERVER__: true,
      __SOCKET__PORT__: this.server.socketUrl.port.toString(),
      __SOCKET__URL__: this.server.socketUrl.socketUrl,
    };

    return data;
  }

  public getRuleContext(
    _options: SDK.RuntimeContextOptions,
  ): SDK.RuntimeContext {
    this.createPackageGraph();

    return {
      root: this.root,
      errors: this._errors.slice(),
      configs: this._configs.slice(),
      moduleGraph: this._moduleGraph,
      chunkGraph: this._chunkGraph,
      packageGraph: this._packageGraph,
      loader: this._loader.slice(),
      otherReports: { treemapReportHtml: '' },
    };
  }

  public onDataReport(): void | Promise<void> {
    this.server.broadcast();
  }

  public addRsdoctorDataToHTML(
    storeData: SDK.BuilderStoreData,
    htmlContent: string,
  ) {
    let compressTextScripts = `<script>window.${Constants.WINDOW_RSDOCTOR_TAG}={}</script>`;
    for (let key of Object.keys(storeData)) {
      const data = storeData[key];

      const jsonStrFn = () => {
        try {
          if (key === 'configs') {
            return JSON.stringify(jc.decycle(data));
          }
          return JSON.stringify(data);
        } catch (error) {
          console.error(error);
          return '';
        }
      };
      const compressText = Algorithm.compressText(jsonStrFn());

      compressTextScripts = `${compressTextScripts} <script>window.${Constants.WINDOW_RSDOCTOR_TAG}.${key}=${JSON.stringify(compressText)}</script>`;
    }
    compressTextScripts = `${compressTextScripts} <script>window.${Constants.WINDOW_RSDOCTOR_TAG}.enableRoutes=${JSON.stringify(this.getClientRoutes())}</script>`;

    htmlContent = htmlContent.replace('<body>', `<body>${compressTextScripts}`);

    return htmlContent;
  }

  public inlineScriptsAndStyles(htmlFilePath: string) {
    // Helper function to inline JavaScript files
    function inlineScripts(basePath: string, scripts: string[]): string {
      return scripts
        .map((src) => {
          const scriptPath = path.resolve(basePath, src);
          try {
            const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
            return `<script>${scriptContent}</script>`;
          } catch (error) {
            console.error(`Could not read script at ${scriptPath}:`, error);
            return '';
          }
        })
        .join('');
    }

    // Helper function to inline CSS files
    function inlineCss(basePath: string, cssFiles: string[]): string {
      return cssFiles
        .map((href) => {
          const cssPath = path.resolve(basePath, href);
          try {
            const cssContent = fs.readFileSync(cssPath, 'utf-8');
            return `<style>${cssContent}</style>`;
          } catch (error) {
            console.error(`Could not read CSS at ${cssPath}:`, error);
            return '';
          }
        })
        .join('');
    }

    // Path to your HTML file
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');

    // Base path to the resources
    const basePath = path.dirname(htmlFilePath);

    // Extract scripts and links from the HTML
    const scriptSrcs = Array.from(
      htmlContent.matchAll(
        /<script\s+(?:defer="defer"|defer)\s+src=["'](.+?)["']><\/script>/g,
      ),
      (m) => m[1],
    );
    const cssHrefs = Array.from(
      htmlContent.matchAll(/<link\s+href=["'](.+?)["']\s+rel="stylesheet">/g),
      (m) => m[1],
    );

    // Remove all <script> tags
    htmlContent = htmlContent.replace(
      /<script\s+.*?src=["'].*?["']><\/script>/g,
      '',
    );

    // Remove all <link rel="stylesheet"> tags
    htmlContent = htmlContent.replace(
      /<link\s+.*?rel=["']stylesheet["'].*?>/g,
      '',
    );

    // Inline scripts and CSS
    const inlinedScripts = inlineScripts(basePath, scriptSrcs);
    const inlinedCss = inlineCss(basePath, cssHrefs);

    const index = htmlContent.indexOf('</body>');
    htmlContent =
      htmlContent.slice(0, index) +
      inlinedCss +
      inlinedScripts +
      htmlContent.slice(index);
    htmlContent = this.addRsdoctorDataToHTML(this.getStoreData(), htmlContent);

    // Output the processed HTML content
    const outputFilePath = path.resolve(
      this.outputDir,
      this.extraConfig?.brief?.htmlOptions?.reportHtmlName ||
        'rsdoctor-report.html',
    );

    File.fse.outputFileSync(outputFilePath, htmlContent, {
      encoding: 'utf-8',
      flag: 'w',
    });
    return outputFilePath;
  }
}
