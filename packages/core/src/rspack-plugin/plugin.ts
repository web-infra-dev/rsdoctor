import { Loader as BuildUtilLoader } from '../build-utils';
import {
  ensureModulesChunksGraphFn,
  handleBriefModeReport,
  InternalBundlePlugin,
  InternalErrorReporterPlugin,
  InternalLoaderPlugin,
  InternalPluginsPlugin,
  InternalResolverPlugin,
  InternalRulesPlugin,
  InternalSummaryPlugin,
  normalizeRspackUserOptions,
  processCompilerConfig,
  setSDK,
} from '../inner-plugins';
import { getRspackNativePlugin } from '../inner-plugins/plugins/rspack';
import { logger, time, timeEnd } from '../logger';
import { findRoot, RsdoctorPrimarySDK, RsdoctorSDKController } from '../sdk';
import type {
  RsdoctorRspackPluginInstance,
  RsdoctorRspackPluginOptions,
  RsdoctorRspackPluginOptionsNormalized,
} from '../types';
import { Loader } from '@rsdoctor/shared/common-browser';
import { ModuleGraph } from '@rsdoctor/shared/graph';
import {
  Constants,
  Config,
  Linter,
  Manifest,
  Manifest as ManifestType,
  Plugin,
  SDK,
} from '@rsdoctor/shared/types';
import path from 'node:path';
import { pluginTapName, pluginTapPostOptions, pkg } from './constants';
import { acquireBuildSession, type RsdoctorBuildSessionLease } from './session';

// Static flag to ensure greet message is only printed once per process
let hasGreeted = false;

class RsdoctorCompilerContext implements RsdoctorRspackPluginInstance<
  Linter.ExtendRuleData[]
> {
  public readonly name = pluginTapName;

  public readonly isRsdoctorPlugin = true;

  public readonly modulesGraph = new ModuleGraph() as SDK.ModuleGraphInstance;

  public bootstrapTask?: Promise<unknown>;

  public applied = false;

  constructor(
    public readonly sdk: SDK.RsdoctorBuilderSDKInstance,
    public readonly options: RsdoctorRspackPluginOptionsNormalized<
      Linter.ExtendRuleData[]
    >,
  ) {}

  apply() {}

  ensureModulesChunksGraphApplied(compiler: Plugin.BaseCompilerType<'rspack'>) {
    ensureModulesChunksGraphFn(
      compiler,
      this as unknown as RsdoctorRspackPluginInstance<Linter.ExtendRuleData[]>,
    );
  }
}

export class RsdoctorRspackPlugin<
  Rules extends Linter.ExtendRuleData[],
> implements RsdoctorRspackPluginInstance<Rules> {
  public readonly name = pluginTapName;

  public readonly isRsdoctorPlugin = true;

  public readonly options: RsdoctorRspackPluginOptionsNormalized<Rules>;

  public readonly outsideInstance: boolean;

  private readonly defaultName: string;

  private readonly defaultStage?: number;

  private readonly controller?: RsdoctorSDKController;

  private readonly sessionLease?: RsdoctorBuildSessionLease;

  private readonly primaryContext: RsdoctorCompilerContext;

  private readonly compilerContexts = new WeakMap<
    Plugin.BaseCompilerType<'rspack'>,
    RsdoctorCompilerContext
  >();

  private appliedCompilerCount = 0;

  constructor(options?: RsdoctorRspackPluginOptions<Rules>) {
    this.options = normalizeRspackUserOptions<Rules>(
      Object.assign(options || {}, {
        supports: {
          ...options?.supports,
        },
      }),
    );
    this.outsideInstance = Boolean(this.options.sdkInstance);

    const compatibilityOptions = options as
      | (RsdoctorRspackPluginOptions<Rules> & {
          name?: string;
          stage?: number;
        })
      | undefined;
    this.defaultName = compatibilityOptions?.name || pluginTapName;
    this.defaultStage = compatibilityOptions?.stage;

    if (this.options.sdkInstance) {
      this.primaryContext = new RsdoctorCompilerContext(
        this.options.sdkInstance,
        this.options as unknown as RsdoctorRspackPluginOptionsNormalized<
          Linter.ExtendRuleData[]
        >,
      );
      return;
    }

    this.sessionLease = acquireBuildSession(this.options);
    this.controller = this.sessionLease.controller;
    this.primaryContext = this.createCompilerContext(this.defaultStage);
  }

  public get sdk() {
    return this.primaryContext.sdk;
  }

  public get modulesGraph() {
    return this.primaryContext.modulesGraph;
  }

  public get _bootstrapTask() {
    return this.primaryContext.bootstrapTask!;
  }

  public getCompilerSDK(name: string) {
    if (this.sdk.name === name) {
      return this.sdk;
    }
    if (this.sdk instanceof RsdoctorPrimarySDK) {
      return this.sdk.parent.slaves.find((sdk) => sdk.name === name);
    }
    return undefined;
  }

  // avoid hint error from ts type validation
  apply(compiler: unknown): unknown;

  apply(compiler: Plugin.BaseCompilerType<'rspack'>) {
    const context = this.getCompilerContext(compiler);
    if (context.applied) {
      return;
    }
    context.applied = true;

    time('RsdoctorRspackPlugin.apply');
    try {
      if (!hasGreeted && !compiler.isChild()) {
        hasGreeted = true;
        logger.greet(`
        \nRsdoctor v${pkg.version}\n`);
      }

      this.releasePendingSessionOnRun(compiler);

      if (!context.bootstrapTask) {
        context.bootstrapTask = context.sdk.bootstrap();
      }

      const compilerName =
        compiler.name ||
        compiler.options.name ||
        (this.appliedCompilerCount === 1
          ? this.defaultName
          : `${this.defaultName}-${this.appliedCompilerCount}`);
      context.sdk.setName(compilerName);

      if (context.sdk instanceof RsdoctorPrimarySDK) {
        if ('dependencies' in compiler.options) {
          context.sdk.dependencies = compiler.options.dependencies;
        }
        context.sdk.parent.registerSlave(context.sdk);
        context.sdk.parent.setOutputDir(
          context.sdk,
          this.getOutputDir(compiler),
        );
        if (this.options.output.mode === SDK.IMode[SDK.IMode.brief]) {
          context.sdk.reportFileName = this.getBriefReportFileName();
        }
      }

      setSDK(context.sdk);

      compiler.hooks.afterPlugins.tap(pluginTapPostOptions, () =>
        this.afterPlugins(compiler, context),
      );
      compiler.hooks.done.tapPromise(
        {
          ...pluginTapPostOptions,
          stage: pluginTapPostOptions.stage! + 100,
        },
        () => this.done(compiler, context),
      );

      // TODO: to fix the TypeError: Type instantiation is excessively deep and possibly infinite.
      // @ts-ignore
      new InternalSummaryPlugin<Plugin.BaseCompilerType<'rspack'>>(
        context,
      ).apply(compiler);

      if (this.options.features.loader) {
        new BuildUtilLoader.ProbeLoaderPlugin().apply(compiler);
        context.sdk.addClientRoutes([
          Manifest.RsdoctorManifestClientRoutes.Loaders,
        ]);

        if (!Loader.isVue(compiler)) {
          new InternalLoaderPlugin<Plugin.BaseCompilerType<'rspack'>>(
            context,
          ).apply(compiler);
        }
      }

      if (this.options.features.plugins) {
        new InternalPluginsPlugin<Plugin.BaseCompilerType<'rspack'>>(
          context,
        ).apply(compiler);
      }

      if (this.options.features.bundle) {
        new InternalBundlePlugin<Plugin.BaseCompilerType<'rspack'>>(
          context,
        ).apply(compiler);
      }

      if (this.options.features.resolver) {
        new InternalResolverPlugin<Plugin.BaseCompilerType<'rspack'>>(
          context,
        ).apply(compiler);
      }

      new InternalRulesPlugin(context).apply(compiler);
      new InternalErrorReporterPlugin(context).apply(compiler);

      const RsdoctorRspackNativePlugin = getRspackNativePlugin(compiler);
      logger.debug('[RspackNativePlugin] Enabled');
      new RsdoctorRspackNativePlugin({
        moduleGraphFeatures: true,
        chunkGraphFeatures: true,
        sourceMapFeatures: {
          cheap: false,
          module: false,
        },
      }).apply(compiler);
    } finally {
      timeEnd('RsdoctorRspackPlugin.apply');
    }
  }

  public ensureModulesChunksGraphApplied(
    compiler: Plugin.BaseCompilerType<'rspack'>,
  ) {
    this.getCompilerContext(compiler).ensureModulesChunksGraphApplied(compiler);
  }

  public afterPlugins = (
    compiler: Plugin.BaseCompilerType<'rspack'>,
    context = this.getCompilerContext(compiler),
  ): void => {
    time('RsdoctorRspackPlugin.afterPlugins');
    try {
      this.getRspackConfig(compiler, context);
    } finally {
      timeEnd('RsdoctorRspackPlugin.afterPlugins');
    }
  };

  public done = async (
    compiler: Plugin.BaseCompilerType<'rspack'>,
    context = this.getCompilerContext(compiler),
  ): Promise<void> => {
    time('RsdoctorRspackPlugin.done');
    try {
      logger.debug('[RsdoctorRspackPlugin] bootstrap(start) in done()');
      await context.bootstrapTask;
      logger.debug('[RsdoctorRspackPlugin] bootstrap(end) in done()');

      context.sdk.addClientRoutes([
        ManifestType.RsdoctorManifestClientRoutes.Overall,
      ]);

      if (context.sdk instanceof RsdoctorPrimarySDK) {
        context.sdk.setOutputDir(
          context.sdk.parent.getCompilerOutputDir(context.sdk),
        );
      } else {
        context.sdk.setOutputDir(this.getOutputDir(compiler));
      }

      await context.sdk.writeStore();

      const isPrimaryCompiler =
        !(context.sdk instanceof RsdoctorPrimarySDK) || context.sdk.isMaster;
      if (!this.options.disableClientServer && isPrimaryCompiler) {
        if (this.options.output.mode === SDK.IMode[SDK.IMode.brief]) {
          await handleBriefModeReport(
            context.sdk,
            this.options,
            this.options.disableClientServer,
          );
        } else {
          await context.sdk.server.openClientPage('homepage');
        }
      }

      if (
        this.options.disableClientServer ||
        (this.options.output.mode === SDK.IMode[SDK.IMode.brief] &&
          Array.isArray(this.options.output.options?.type) &&
          this.options.output.options.type.length === 1 &&
          this.options.output.options.type[0] === 'json')
      ) {
        await context.sdk.dispose();
      }
    } finally {
      timeEnd('RsdoctorRspackPlugin.done');
    }
  };

  public getRspackConfig(
    compiler: Plugin.BaseCompilerType<'rspack'>,
    context = this.getCompilerContext(compiler),
  ) {
    time('RsdoctorRspackPlugin.getRspackConfig');
    try {
      if (compiler.isChild()) return;

      const configuration = processCompilerConfig(compiler.options);
      const { rspackVersion } = compiler.rspack;

      context.sdk.reportConfiguration({
        name: 'rspack',
        version: rspackVersion || 'unknown',
        config: configuration,
        root: findRoot() || '',
      });
    } finally {
      timeEnd('RsdoctorRspackPlugin.getRspackConfig');
    }
  }

  private createCompilerContext(stage?: number) {
    const controller = this.controller!;
    const { output, innerClientPath, printLog, server, features } =
      this.options;
    const sdk = controller.createSlave({
      name: this.defaultName,
      stage,
      extraConfig: {
        innerClientPath,
        printLog,
        server,
        mode: output.mode || undefined,
        brief:
          output.mode === SDK.IMode[SDK.IMode.brief]
            ? output.options || undefined
            : undefined,
        features: { treeShaking: features.treeShaking },
      },
      type: output.reportCodeType,
    });
    return new RsdoctorCompilerContext(
      sdk,
      this.options as unknown as RsdoctorRspackPluginOptionsNormalized<
        Linter.ExtendRuleData[]
      >,
    );
  }

  private getCompilerContext(compiler: Plugin.BaseCompilerType<'rspack'>) {
    const existing = this.compilerContexts.get(compiler);
    if (existing) {
      return existing;
    }

    let context: RsdoctorCompilerContext;
    if (this.appliedCompilerCount === 0) {
      context = this.primaryContext;
    } else {
      if (!this.controller) {
        throw new Error(
          '[RsdoctorRspackPlugin] A fixed sdkInstance cannot be shared by multiple compilers. Create one plugin instance per compiler with a separate sdkInstance.',
        );
      }
      if (!this.options.multiCompiler.enabled) {
        throw new Error(
          '[RsdoctorRspackPlugin] This plugin instance was applied to multiple compilers while multiCompiler is disabled.',
        );
      }
      context = this.createCompilerContext();
    }

    this.appliedCompilerCount += 1;
    this.compilerContexts.set(compiler, context);
    return context;
  }

  private getOutputDir(compiler: Plugin.BaseCompilerType<'rspack'>) {
    return path.resolve(
      this.options.output.reportDir || compiler.outputPath,
      this.options.output.mode === SDK.IMode[SDK.IMode.brief]
        ? ''
        : `./${Constants.RsdoctorOutputFolder}`,
    );
  }

  private getBriefReportFileName() {
    const options = this.options.output.options as Config.BriefModeOptions;
    if (options.type?.includes('html')) {
      return options.htmlOptions?.reportHtmlName || 'rsdoctor-report.html';
    }
    return options.jsonOptions?.fileName || 'rsdoctor-data.json';
  }

  private releasePendingSessionOnRun(
    compiler: Plugin.BaseCompilerType<'rspack'>,
  ) {
    if (!this.sessionLease) {
      return;
    }

    const release = this.sessionLease.release;
    compiler.hooks.beforeRun.tap(pluginTapName, release);
    compiler.hooks.watchRun.tap(pluginTapName, release);
  }
}
